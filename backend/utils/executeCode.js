const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");

// System temp directory for local execution
const tempDir = path.join(os.tmpdir(), "code-playground-temp");
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Piston API configuration
const PISTON_API_URL = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston/execute";
const PISTON_API_KEY = process.env.PISTON_API_KEY || "";

const PISTON_LANGUAGE_MAP = {
    python: { language: "python", version: "3.10.0", file: "main.py" },
    py: { language: "python", version: "3.10.0", file: "main.py" },
    cpp: { language: "cpp", version: "10.2.0", file: "main.cpp" },
    "c++": { language: "cpp", version: "10.2.0", file: "main.cpp" },
    c: { language: "c", version: "10.2.0", file: "main.c" },
    java: { language: "java", version: "15.0.2", file: "Main.java" },
    javascript: { language: "javascript", version: "18.15.0", file: "main.js" },
    js: { language: "javascript", version: "18.15.0", file: "main.js" }
};

// Wandbox API configuration
const WANDBOX_API_URL = "https://wandbox.org/api/compile.json";
const WANDBOX_COMPILER_MAP = {
    python: "cpython-3.10.15",
    py: "cpython-3.10.15",
    cpp: "gcc-13.2.0",
    "c++": "gcc-13.2.0",
    c: "gcc-13.2.0-c",
    java: "openjdk-jdk-21+35",
    javascript: "nodejs-20.17.0",
    js: "nodejs-20.17.0"
};

/**
 * Execute code via Wandbox Cloud Sandbox
 */
async function executeViaWandbox(code, language, input = "") {
    const langKey = language.toLowerCase();
    const compiler = WANDBOX_COMPILER_MAP[langKey];
    if (!compiler) {
        throw new Error(`Language '${language}' is not supported by Wandbox`);
    }

    let codeToSend = code;
    if (langKey === "java" && !code.includes("class ")) {
        codeToSend = `public class Main {\n    public static void main(String[] args) {\n        ${code}\n    }\n}`;
    }

    const response = await axios.post(
        WANDBOX_API_URL,
        {
            compiler,
            code: codeToSend,
            stdin: input || ""
        },
        {
            headers: { "Content-Type": "application/json" },
            timeout: 15000
        }
    );

    const data = response.data;
    const isSuccess = data.status === "0";
    const stdout = (data.program_output || "").trim();
    const stderr = (data.compiler_error || data.program_error || data.compiler_message || "").trim();

    if (!isSuccess && stderr && !stdout) {
        return {
            status: "error",
            output: stdout,
            error: stderr
        };
    }

    return {
        status: isSuccess ? "success" : "error",
        output: stdout,
        error: stderr
    };
}

/**
 * Execute code via Piston API
 */
async function executeViaPiston(code, language, input = "") {
    const langKey = language.toLowerCase();
    const config = PISTON_LANGUAGE_MAP[langKey];

    if (!config) {
        throw new Error(`Language '${language}' is not supported by Piston sandbox`);
    }

    let codeToSend = code;
    if (config.language === "java" && !code.includes("class ")) {
        codeToSend = `public class Main {\n    public static void main(String[] args) {\n        ${code}\n    }\n}`;
    }

    const headers = { "Content-Type": "application/json" };
    if (PISTON_API_KEY) {
        headers["Authorization"] = PISTON_API_KEY;
    }

    const response = await axios.post(
        PISTON_API_URL,
        {
            language: config.language,
            version: config.version,
            files: [
                {
                    name: config.file,
                    content: codeToSend
                }
            ],
            stdin: input || "",
            run_timeout: 5000,
            compile_timeout: 10000
        },
        {
            headers,
            timeout: 15000
        }
    );

    const { run, compile } = response.data;

    if (compile && compile.code !== 0 && compile.stderr) {
        return {
            status: "error",
            output: "",
            error: compile.stderr.trim()
        };
    }

    if (run) {
        if (run.code !== 0 && !run.stdout) {
            return {
                status: "error",
                output: run.stdout || "",
                error: (run.stderr || run.output || `Process exited with code ${run.code}`).trim()
            };
        }

        return {
            status: "success",
            output: (run.stdout || run.output || "").trim(),
            error: run.stderr ? run.stderr.trim() : ""
        };
    }

    throw new Error("Invalid response received from Piston sandbox");
}

/**
 * Execute code locally via native host/container compilers (Python, GCC, Clang, OpenJDK, Node.js)
 */
async function executeLocally(code, language, input = "") {
    return new Promise((resolve, reject) => {
        try {
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const fileName = `cp_${timestamp}_${randomStr}`;
            let filePath, executionCmd, className = "Main";
            const isWindows = process.platform === "win32";

            switch (language.toLowerCase()) {
                case "python":
                case "py":
                    filePath = path.join(tempDir, `${fileName}.py`);
                    fs.writeFileSync(filePath, code);
                    const pythonCmd = isWindows ? "python" : "python3";
                    executionCmd = `${pythonCmd} "${filePath}"`;
                    break;

                case "cpp":
                case "c++":
                    filePath = path.join(tempDir, `${fileName}.cpp`);
                    fs.writeFileSync(filePath, code);
                    const cppOutputPath = path.join(tempDir, isWindows ? `${fileName}.exe` : fileName);
                    const cppCompiler = process.platform === "darwin" ? "clang++" : "g++";
                    executionCmd = `${cppCompiler} -O2 -o "${cppOutputPath}" "${filePath}" && "${cppOutputPath}"`;
                    break;

                case "c":
                    filePath = path.join(tempDir, `${fileName}.c`);
                    fs.writeFileSync(filePath, code);
                    const cOutputPath = path.join(tempDir, isWindows ? `${fileName}.exe` : fileName);
                    const cCompiler = process.platform === "darwin" ? "clang" : "gcc";
                    executionCmd = `${cCompiler} -O2 -o "${cOutputPath}" "${filePath}" && "${cOutputPath}"`;
                    break;

                case "java":
                    const publicMatch = code.match(/public\s+class\s+(\w+)/);
                    const classMatch = code.match(/class\s+(\w+)/);
                    if (publicMatch) {
                        className = publicMatch[1];
                    } else if (classMatch) {
                        className = classMatch[1];
                    } else {
                        code = `class Main {\n    public static void main(String[] args) {\n        ${code}\n    }\n}`;
                    }

                    filePath = path.join(tempDir, `${className}.java`);
                    fs.writeFileSync(filePath, code);
                    executionCmd = `cd "${tempDir}" && javac "${className}.java" && java "${className}"`;
                    break;

                case "javascript":
                case "js":
                    filePath = path.join(tempDir, `${fileName}.js`);
                    fs.writeFileSync(filePath, code);
                    executionCmd = `node "${filePath}"`;
                    break;

                default:
                    return reject(new Error(`Language '${language}' is not supported for local compilation`));
            }

            let inputFilePath = null;
            if (input) {
                inputFilePath = path.join(tempDir, `${fileName}.in`);
                fs.writeFileSync(inputFilePath, input);
                executionCmd += ` < "${inputFilePath}"`;
            }

            exec(executionCmd, { timeout: 7000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                // Guaranteed cleanup of temp files
                try {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    if (inputFilePath && fs.existsSync(inputFilePath)) fs.unlinkSync(inputFilePath);

                    const binExts = isWindows ? [".exe", ""] : [""];
                    binExts.forEach(ext => {
                        const binPath = path.join(tempDir, `${fileName}${ext}`);
                        if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
                    });

                    if (language.toLowerCase() === "java") {
                        const classFile = path.join(tempDir, `${className}.class`);
                        if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
                    }
                } catch (cleanupErr) {
                    // Ignore background cleanup issues
                }

                if (error) {
                    resolve({
                        status: "error",
                        output: (stdout || "").trim(),
                        error: (stderr || error.message).trim()
                    });
                } else {
                    resolve({
                        status: "success",
                        output: (stdout || "").trim(),
                        error: (stderr || "").trim()
                    });
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Execute code via cloud sandbox (tries Wandbox, then Piston)
 */
async function executeViaCloud(code, language, input = "") {
    try {
        return await executeViaWandbox(code, language, input);
    } catch (wandboxErr) {
        return await executeViaPiston(code, language, input);
    }
}

/**
 * Main executeCode router:
 * Automatically uses the best available execution engine:
 * 1. Local compilers (ultra-fast, zero external rate limits, pre-installed in Docker)
 * 2. Cloud Sandboxes (Wandbox / Piston API)
 *
 * Configurable via EXECUTION_MODE env var ("auto", "local", "cloud").
 */
async function executeCode(code, language, input = "") {
    if (!code || !language) {
        throw new Error("Code and language are required");
    }

    const mode = (process.env.EXECUTION_MODE || "auto").toLowerCase();

    if (mode === "cloud") {
        try {
            return await executeViaCloud(code, language, input);
        } catch (cloudErr) {
            console.warn("Cloud execution failed, attempting local fallback:", cloudErr.message);
            try {
                return await executeLocally(code, language, input);
            } catch (fallbackErr) {
                return {
                    status: "error",
                    output: "",
                    error: `Execution error: ${cloudErr.message || fallbackErr.message}`
                };
            }
        }
    }

    // Default mode: "auto" or "local"
    // Attempts local native execution first for lowest latency and zero external dependency
    try {
        return await executeLocally(code, language, input);
    } catch (localErr) {
        console.warn("Local execution not available for this language/environment, attempting cloud sandbox:", localErr.message);
        try {
            return await executeViaCloud(code, language, input);
        } catch (cloudErr) {
            return {
                status: "error",
                output: "",
                error: `Execution failed: ${localErr.message}. Cloud fallback also failed: ${cloudErr.message}`
            };
        }
    }
}

module.exports = executeCode;