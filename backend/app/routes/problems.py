import logging
import base64
import httpx
import sys
import subprocess
import tempfile
import os
import shutil
from datetime import datetime
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config.settings import settings
from app.models.user import User
from app.models.coding import CodingProgress
from app.models.problem import ProblemDetail
from app.utils.auth import get_current_user
from app.services.ai_service import AIService
from app.services.placement_service import PlacementService

logger = logging.getLogger("codepilot")

router = APIRouter(prefix="/api/coding/problem", tags=["DSA Code Editor Sandbox"])

import ast
import re

class CodeRunInput(BaseModel):
    language: str  # "python", "java", "cpp"
    code: str
    custom_input: Optional[str] = None

def parse_custom_input(custom_input: str):
    args = []
    for line in custom_input.strip().split('\n'):
        line = line.strip()
        if not line:
            continue
        # If it's a key-value like nums = [1,2,3], extract the value
        if '=' in line and not (line.startswith('[') or line.startswith('{') or line.startswith('"') or line.startswith("'")):
            parts = line.split('=', 1)
            line = parts[1].strip()
        try:
            val = ast.literal_eval(line)
            args.append(val)
        except Exception:
            # Fallback to raw string
            args.append(line)
    return args

def to_cpp_literal(val) -> str:
    if isinstance(val, list):
        if not val:
            return "vector<int>{}"
        # Check if it is a list of lists
        if isinstance(val[0], list):
            inner = ", ".join(to_cpp_literal(x) for x in val)
            return f"vector<vector<int>>{{{inner}}}"
        else:
            inner = ", ".join(str(x) for x in val)
            return f"vector<int>{{{inner}}}"
    elif isinstance(val, bool):
        return "true" if val else "false"
    elif isinstance(val, str):
        return f'"{val}"'
    else:
        return str(val)

def to_java_literal(val) -> str:
    if isinstance(val, list):
        if not val:
            return "new int[]{}"
        if isinstance(val[0], list):
            inner = ", ".join(to_java_literal(x).replace("new int[]", "") for x in val)
            return f"new int[][]{{{inner}}}"
        else:
            inner = ", ".join(str(x) for x in val)
            return f"new int[]{{{inner}}}"
    elif isinstance(val, bool):
        return "true" if val else "false"
    elif isinstance(val, str):
        return f'"{val}"'
    else:
        return str(val)

def extract_function_name(template: str) -> str:
    # Remove comments
    template_clean = re.sub(r'//.*|#.*|/\*.*?\*/', '', template, flags=re.S)
    
    # Try Python def
    py_match = re.search(r'def\s+([a-zA-Z0-9_]+)\s*\(', template_clean)
    if py_match:
        return py_match.group(1)
        
    # Find all words before '('
    candidates = re.findall(r'([a-zA-Z0-9_]+)\s*\(', template_clean)
    for c in candidates:
        if c not in ("Solution", "class", "public", "vector", "int", "bool", "void", "unordered_set", "unordered_map", "set", "map", "list", "String", "boolean", "main", "System", "out", "print", "println"):
            return c
    return "solve"

DEFAULT_INPUTS = {
    "two-sum": "nums = [2,7,11,15]\ntarget = 9",
    "contains-duplicate": "[1,2,3,1]",
    "valid-anagram": "\"anagram\"\n\"nagaram\"",
    "group-anagrams": "[\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
    "top-k-frequent-elements": "[1,1,1,2,2,3]\n2",
    "product-of-array-except-self": "[1,2,3,4]",
    "longest-consecutive-sequence": "[100,4,200,1,3,2]",
    "two-sum-ii-input-array-is-sorted": "[2,7,11,15]\n9",
    "3sum": "[-1,0,1,2,-1,-4]",
    "container-with-most-water": "[1,8,6,2,5,4,8,3,7]",
    "trapping-rain-water": "[0,1,0,2,1,0,1,3,2,1,2,1]",
    "valid-parentheses": "\"()\"",
    "min-stack": "[\"MinStack\",\"push\",\"push\",\"push\",\"getMin\",\"pop\",\"top\",\"getMin\"]\n[[],[-2],[0],[-3],[],[],[],[]]",
    "evaluate-reverse-polish-notation": "[\"2\",\"1\",\"+\",\"3\",\"*\"]",
    "generate-parentheses": "3",
    "daily-temperatures": "[73,74,75,71,69,72,76,73]",
    "car-fleet": "12\n[10,8,0,5,3]\n[2,4,1,1,3]"
}

# Helper functions to handle Base64 encoding/decoding for Judge0
def encode_b64(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("utf-8")

def decode_b64(encoded: Optional[str]) -> str:
    if not encoded:
        return ""
    try:
        return base64.b64decode(encoded.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""

@router.get("/{question_id}")
async def get_problem_details(
    question_id: str, 
    title: str, 
    difficulty: str, 
    user: User = Depends(get_current_user)
):
    """
    Fetches the problem markdown description and starting boilerplate code templates.
    Generates them via AI on-demand if they are not cached.
    """
    # 1. Search in local db cache
    problem = await ProblemDetail.find_one(ProblemDetail.question_id == question_id)
    
    # Check if we need to generate or regenerate (in case of missing fields/languages)
    needs_generation = False
    if not problem:
        needs_generation = True
    else:
        # Check if any standard languages are missing from templates or harnesses
        languages = ["python", "java", "cpp"]
        has_all_templates = problem.templates and all(lang in problem.templates for lang in languages)
        has_all_harnesses = problem.harnesses and all(lang in problem.harnesses for lang in languages)
        if not has_all_templates or not has_all_harnesses:
            needs_generation = True
            
    if needs_generation:
        logger.info(f"Problem detail for '{question_id}' needs generation. Generating via AI...")
        try:
            spec = await AIService.generate_problem_specification(
                title=title, 
                difficulty=difficulty, 
                question_id=question_id,
                user_id=user.id
            )
            
            if problem:
                # Update existing
                problem.description = spec.get("description", "No description available.")
                problem.templates = spec.get("templates", {})
                problem.harnesses = spec.get("harnesses", {})
                problem.topics = spec.get("topics", [])
                problem.companies = spec.get("companies", [])
                problem.hints = spec.get("hints", [])
                await problem.save()
            else:
                # Create new
                problem = ProblemDetail(
                    question_id=question_id,
                    title=title,
                    difficulty=difficulty,
                    description=spec.get("description", "No description available."),
                    templates=spec.get("templates", {}),
                    harnesses=spec.get("harnesses", {}),
                    topics=spec.get("topics", []),
                    companies=spec.get("companies", []),
                    hints=spec.get("hints", [])
                )
                await problem.create()
            logger.info(f"Successfully cached problem detail for '{question_id}'")
        except Exception as e:
            logger.exception(f"Failed to generate problem detail for '{question_id}'")
            # If we had a cached one, return it as fallback instead of throwing error
            if not problem:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Could not generate coding challenge workspace: {e}"
                )
            
    return {
        "question_id": problem.question_id,
        "title": problem.title,
        "difficulty": problem.difficulty,
        "description": problem.description,
        "templates": problem.templates,
        "topics": problem.topics or [],
        "companies": problem.companies or [],
        "hints": problem.hints or [],
        "default_input": DEFAULT_INPUTS.get(question_id, "")
    }

@router.post("/{question_id}/run")
async def run_and_grade_code(
    question_id: str,
    data: CodeRunInput,
    user: User = Depends(get_current_user)
):
    """
    Merges user code with the assertion test harness, compiles and executes it via Judge0 (or local fallback), 
    and updates progress if successful.
    """
    # 1. Fetch cached problem spec
    problem = await ProblemDetail.find_one(ProblemDetail.question_id == question_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem details not found.")

    language = data.language.lower()
    harness = problem.harnesses.get(language)
    if not harness:
        raise HTTPException(status_code=400, detail=f"Language '{data.language}' is not supported for this problem.")

    # 2. Merge code and test harness/custom runner
    user_code = data.code
    custom_input = data.custom_input
    
    if custom_input:
        try:
            parsed_args = parse_custom_input(custom_input)
            template = problem.templates.get(language, "")
            func_name = extract_function_name(template)
            
            # Escape custom_input for safe print statement output strings
            custom_input_escaped = custom_input.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            
            if language == "python":
                custom_harness = (
                    f"\n\nif __name__ == '__main__':\n"
                    f"    import sys\n"
                    f"    s = Solution()\n"
                    f"    try:\n"
                    f"        res = s.{func_name}(*{parsed_args})\n"
                    f"        print('Case 1: Success')\n"
                    f"        print(\"Input: {custom_input_escaped}\")\n"
                    f"        print(f\"Output: {{res}}\")\n"
                    f"        print('SUCCESS')\n"
                    f"    except Exception as e:\n"
                    f"        print(f'Runtime Error: {{e}}', file=sys.stderr)\n"
                    f"        sys.exit(1)\n"
                )
                combined_code = "from typing import *\n\n" + user_code + "\n\n" + custom_harness
                language_id = 71  # Python 3
            elif language == "cpp":
                cpp_args = [to_cpp_literal(arg) for arg in parsed_args]
                cpp_args_str = ", ".join(cpp_args)
                custom_harness = (
                    f"\n\n// Helpers to print C++ types\n"
                    f"void print_result(bool val) {{ std::cout << (val ? \"true\" : \"false\"); }}\n"
                    f"void print_result(int val) {{ std::cout << val; }}\n"
                    f"void print_result(double val) {{ std::cout << val; }}\n"
                    f"void print_result(const std::string& val) {{ std::cout << val; }}\n"
                    f"void print_result(const std::vector<int>& val) {{\n"
                    f"    std::cout << \"[\";\n"
                    f"    for (size_t i = 0; i < val.size(); i++) {{\n"
                    f"        std::cout << val[i] << (i + 1 < val.size() ? \",\" : \"\");\n"
                    f"    }}\n"
                    f"    std::cout << \"]\";\n"
                    f"}}\n"
                    f"void print_result(const std::vector<std::vector<int>>& val) {{\n"
                    f"    std::cout << \"[\";\n"
                    f"    for (size_t i = 0; i < val.size(); i++) {{\n"
                    f"        print_result(val[i]);\n"
                    f"        std::cout << (i + 1 < val.size() ? \",\" : \"\");\n"
                    f"    }}\n"
                    f"    std::cout << \"]\";\n"
                    f"}}\n\n"
                    f"int main() {{\n"
                    f"    Solution s;\n"
                    f"    try {{\n"
                    f"        auto res = s.{func_name}({cpp_args_str});\n"
                    f"        std::cout << \"Case 1: Success\" << std::endl;\n"
                    f"        std::cout << \"Input: \" << \"{custom_input_escaped}\" << std::endl;\n"
                    f"        std::cout << \"Output: \";\n"
                    f"        print_result(res);\n"
                    f"        std::cout << std::endl;\n"
                    f"        std::cout << \"SUCCESS\" << std::endl;\n"
                    f"    }} catch (const std::exception& e) {{\n"
                    f"        std::cerr << \"Runtime Error: \" << e.what() << std::endl;\n"
                    f"        return 1;\n"
                    f"    }}\n"
                    f"    return 0;\n"
                    f"}}\n"
                )
                headers = (
                    "#include <iostream>\n"
                    "#include <vector>\n"
                    "#include <string>\n"
                    "#include <unordered_map>\n"
                    "#include <unordered_set>\n"
                    "#include <queue>\n"
                    "#include <stack>\n"
                    "#include <algorithm>\n"
                    "#include <map>\n"
                    "#include <set>\n"
                    "#include <list>\n"
                    "#include <cmath>\n\n"
                    "using namespace std;\n\n"
                )
                combined_code = headers + user_code + "\n\n" + custom_harness
                language_id = 54  # C++ (GCC 9.2.0)
            elif language == "java":
                java_args = [to_java_literal(arg) for arg in parsed_args]
                java_args_str = ", ".join(java_args)
                custom_harness = (
                    f"\n\nclass Main {{\n"
                    f"    static void printResult(boolean val) {{ System.out.print(val); }}\n"
                    f"    static void printResult(int val) {{ System.out.print(val); }}\n"
                    f"    static void printResult(String val) {{ System.out.print(val); }}\n"
                    f"    static void printResult(int[] val) {{\n"
                    f"        System.out.print(\"[\");\n"
                    f"        for (int i = 0; i < val.length; i++) {{\n"
                    f"            System.out.print(val[i] + (i + 1 < val.length ? \",\" : \"\"));\n"
                    f"        }}\n"
                    f"        System.out.print(\"]\");\n"
                    f"    }}\n"
                    f"    static void printResult(int[][] val) {{\n"
                    f"        System.out.print(\"[\");\n"
                    f"        for (int i = 0; i < val.length; i++) {{\n"
                    f"            printResult(val[i]);\n"
                    f"            System.out.print(i + 1 < val.length ? \",\" : \"\");\n"
                    f"        }}\n"
                    f"        System.out.print(\"]\");\n"
                    f"    }}\n\n"
                    f"    public static void main(String[] args) {{\n"
                    f"        Solution s = new Solution();\n"
                    f"        try {{\n"
                    f"            var res = s.{func_name}({java_args_str});\n"
                    f"            System.out.println(\"Case 1: Success\");\n"
                    f"            System.out.println(\"Input: \" + \"{custom_input_escaped}\");\n"
                    f"            System.out.print(\"Output: \");\n"
                    f"            printResult(res);\n"
                    f"            System.out.println();\n"
                    f"            System.out.println(\"SUCCESS\");\n"
                    f"        }} catch (Exception e) {{\n"
                    f"            System.err.println(\"Runtime Error: \" + e.getMessage());\n"
                    f"            System.exit(1);\n"
                    f"        }}\n"
                    f"    }}\n"
                    f"}}\n"
                )
                cleaned_user_code = re.sub(r'(public\s+)?class\s+[a-zA-Z0-9_]+', 'class Solution', user_code, count=1)
                headers = "import java.util.*;\nimport java.io.*;\nimport java.math.*;\n\n"
                combined_code = headers + cleaned_user_code + "\n\n" + custom_harness
                language_id = 62  # Java (OpenJDK 13.0.1)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported language '{language}'.")
        except Exception as pe:
            return {
                "passed": False,
                "stdout": "",
                "stderr": f"Failed to parse custom testcase input: {pe}",
                "compile_output": "",
                "status_description": "Runtime Error"
            }
    else:
        if language == "python":
            combined_code = "from typing import *\n\n" + user_code + "\n\n" + harness
            language_id = 71  # Python 3
        elif language == "cpp":
            headers = (
                "#include <iostream>\n"
                "#include <vector>\n"
                "#include <string>\n"
                "#include <unordered_map>\n"
                "#include <unordered_set>\n"
                "#include <queue>\n"
                "#include <stack>\n"
                "#include <algorithm>\n"
                "#include <map>\n"
                "#include <set>\n"
                "#include <list>\n"
                "#include <cmath>\n\n"
                "using namespace std;\n\n"
            )
            combined_code = headers + user_code + "\n\n" + harness
            language_id = 54  # C++ (GCC 9.2.0)
        elif language == "java":
            cleaned_user_code = re.sub(r'(public\s+)?class\s+[a-zA-Z0-9_]+', 'class Solution', user_code, count=1)
            headers = "import java.util.*;\nimport java.io.*;\nimport java.math.*;\n\n"
            combined_code = headers + cleaned_user_code + "\n\n" + harness
            language_id = 62  # Java (OpenJDK 13.0.1)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported language '{language}'.")

    # 3. Check API Key. If empty, fall back to local subprocess-based execution.
    passed = False
    stdout = ""
    stderr = ""
    compile_output = ""
    status_desc = "Unknown"

    if not settings.rapidapi_key:
        if settings.jdoodle_client_id and settings.jdoodle_client_secret:
            logger.info(f"RAPIDAPI_KEY is not configured but JDoodle keys are. Submitting {language} code to JDoodle...")
            jdoodle_lang = "python3"
            version_idx = "4"
            if language == "java":
                jdoodle_lang = "java"
                version_idx = "4"
            elif language == "cpp":
                jdoodle_lang = "cpp17"
                version_idx = "1"
            
            # Remove public from class Main for Java since JDoodle saves the file under a dynamic name
            script_code = combined_code
            if language == "java":
                script_code = script_code.replace("public class Main", "class Main")
                logger.info(f"Java script code sent to JDoodle:\n{script_code}")

            payload = {
                "clientId": settings.jdoodle_client_id,
                "clientSecret": settings.jdoodle_client_secret,
                "script": script_code,
                "language": jdoodle_lang,
                "versionIndex": version_idx,
                "stdin": ""
            }
            
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.post(
                        "https://api.jdoodle.com/v1/execute",
                        json=payload
                    )
                    
                    if response.status_code != 200:
                        logger.error(f"JDoodle API returned error status {response.status_code}: {response.text}")
                        return {
                            "passed": False,
                            "stdout": "",
                            "stderr": f"JDoodle compilation backend returned status {response.status_code}",
                            "compile_output": response.text,
                            "status_description": "Runtime Error"
                        }
                        
                    res_json = response.json()
                    if "error" in res_json:
                        logger.error(f"JDoodle API returned error: {res_json}")
                        return {
                            "passed": False,
                            "stdout": "",
                            "stderr": res_json["error"],
                            "compile_output": "",
                            "status_description": "Runtime Error"
                        }
                    
                    output = res_json.get("output", "")
                    passed = "SUCCESS" in output
                    status_desc = "Accepted" if passed else "Wrong Answer"
                    
                    if not passed:
                        lower_out = output.lower()
                        if "error" in lower_out or "failed" in lower_out or "exception" in lower_out or "syntax" in lower_out:
                            status_desc = "Runtime/Compilation Error"
                            
                    return {
                        "passed": passed,
                        "stdout": output,
                        "stderr": "",
                        "compile_output": "",
                        "status_description": status_desc
                    }
            except Exception as exc:
                logger.exception(f"Failed calling JDoodle compile API: {exc}")
                return {
                    "passed": False,
                    "stdout": "",
                    "stderr": f"JDoodle API communication failure: {exc}",
                    "compile_output": "",
                    "status_description": "Runtime Error"
                }

        logger.info(f"Neither RAPIDAPI_KEY nor JDoodle keys are configured. Running {language} locally in subprocess...")
        if language == "python":
            # Write to a temporary file and run it!
            with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as temp_file:
                temp_file.write(combined_code)
                temp_path = temp_file.name
            
            try:
                result = subprocess.run(
                    [sys.executable, temp_path],
                    capture_output=True,
                    text=True,
                    timeout=5.0
                )
                stdout = result.stdout
                stderr = result.stderr
                passed = "SUCCESS" in stdout
                status_desc = "Accepted" if passed else "Wrong Answer"
            except subprocess.TimeoutExpired:
                stderr = "Time Limit Exceeded (5.0s)"
                status_desc = "Time Limit Exceeded"
            except Exception as e:
                stderr = f"Local Python execution failure: {e}"
                status_desc = "Runtime Error"
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
        elif language == "java":
            # Check if javac is available
            try:
                subprocess.run(["javac", "-version"], capture_output=True)
                has_java = True
            except FileNotFoundError:
                has_java = False
                
            if has_java:
                temp_dir = tempfile.mkdtemp()
                main_java_path = os.path.join(temp_dir, "Main.java")
                with open(main_java_path, "w", encoding="utf-8") as f:
                    f.write(combined_code)
                
                try:
                    compile_res = subprocess.run(
                        ["javac", "Main.java"],
                        cwd=temp_dir,
                        capture_output=True,
                        text=True
                    )
                    if compile_res.returncode != 0:
                        compile_output = compile_res.stderr
                        status_desc = "Compilation Error"
                    else:
                        run_res = subprocess.run(
                            ["java", "Main"],
                            cwd=temp_dir,
                            capture_output=True,
                            text=True,
                            timeout=5.0
                        )
                        stdout = run_res.stdout
                        stderr = run_res.stderr
                        passed = "SUCCESS" in stdout
                        status_desc = "Accepted" if passed else "Wrong Answer"
                except subprocess.TimeoutExpired:
                    stderr = "Time Limit Exceeded (5.0s)"
                    status_desc = "Time Limit Exceeded"
                except Exception as e:
                    stderr = f"Local Java execution failure: {e}"
                    status_desc = "Runtime Error"
                finally:
                    shutil.rmtree(temp_dir, ignore_errors=True)
            else:
                stdout = "RAPIDAPI_KEY is not configured and 'javac' is not available in system PATH. To execute Java code, please add RAPIDAPI_KEY to backend .env."
                status_desc = "Configuration Missing"
                
        elif language == "cpp":
            # Check if g++ is available
            try:
                subprocess.run(["g++", "--version"], capture_output=True)
                has_cpp = True
            except FileNotFoundError:
                has_cpp = False
                
            if has_cpp:
                temp_dir = tempfile.mkdtemp()
                main_cpp_path = os.path.join(temp_dir, "main.cpp")
                exe_path = os.path.join(temp_dir, "main.exe" if os.name == "nt" else "main")
                with open(main_cpp_path, "w", encoding="utf-8") as f:
                    f.write(combined_code)
                
                try:
                    compile_res = subprocess.run(
                        ["g++", "main.cpp", "-o", exe_path],
                        cwd=temp_dir,
                        capture_output=True,
                        text=True
                    )
                    if compile_res.returncode != 0:
                        compile_output = compile_res.stderr
                        status_desc = "Compilation Error"
                    else:
                        run_res = subprocess.run(
                            [exe_path],
                            cwd=temp_dir,
                            capture_output=True,
                            text=True,
                            timeout=5.0
                        )
                        stdout = run_res.stdout
                        stderr = run_res.stderr
                        passed = "SUCCESS" in stdout
                        status_desc = "Accepted" if passed else "Wrong Answer"
                except subprocess.TimeoutExpired:
                    stderr = "Time Limit Exceeded (5.0s)"
                    status_desc = "Time Limit Exceeded"
                except Exception as e:
                    stderr = f"Local C++ execution failure: {e}"
                    status_desc = "Runtime Error"
                finally:
                    shutil.rmtree(temp_dir, ignore_errors=True)
            else:
                stdout = "RAPIDAPI_KEY is not configured and 'g++' is not available in system PATH. To execute C++ code, please add RAPIDAPI_KEY to backend .env."
                status_desc = "Configuration Missing"

    else:
        # 4. Invoke Judge0 RapidAPI
        logger.info(f"Submitting {language} code for '{question_id}' to Judge0...")
        headers = {
            "X-RapidAPI-Key": settings.rapidapi_key,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            "Content-Type": "application/json"
        }
        payload = {
            "language_id": language_id,
            "source_code": encode_b64(combined_code),
            "stdin": encode_b64("")
        }
        
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                response = await client.post(
                    "https://judge0-ce.p.rapidapi.com/submissions?wait=true&base64_encoded=true",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code not in (200, 201):
                    logger.error(f"Judge0 API returned error: {response.text}")
                    return {
                        "passed": False,
                        "stdout": "",
                        "stderr": f"Judge0 compilation backend returned status {response.status_code}",
                        "compile_output": response.text
                    }
                    
                res_json = response.json()
                
                # Decode outputs
                stdout = decode_b64(res_json.get("stdout"))
                stderr = decode_b64(res_json.get("stderr"))
                compile_output = decode_b64(res_json.get("compile_output"))
                
                # Status check
                status_info = res_json.get("status", {})
                status_id = status_info.get("id", 0)
                status_desc = status_info.get("description", "Unknown")
                
                logger.info(f"Judge0 response status for '{question_id}': ID {status_id} ({status_desc})")
                
                # Code validation check
                # We look for the "SUCCESS" marker printed by our test harnesses
                if status_id == 3 and "SUCCESS" in stdout:
                    passed = True
        except Exception as exc:
            logger.exception(f"Failed calling Judge0 compile API: {exc}")
            return {
                "passed": False,
                "stdout": "",
                "stderr": f"Compiler API communication failure: {exc}",
                "compile_output": ""
            }

    # 5. If passed, update CodingProgress db in sync with user profile
    if passed and not custom_input:
        progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
        if progress:
            old_status = progress.dsa_progress.get(question_id, "not_started")
            if old_status != "completed":
                progress.dsa_progress[question_id] = "completed"
                
                # Update daily stats
                today_str = datetime.utcnow().strftime("%Y-%m-%d")
                if not progress.daily_solved_count:
                    progress.daily_solved_count = {}
                progress.daily_solved_count[today_str] = progress.daily_solved_count.get(today_str, 0) + 1
                
                await progress.save()
                await PlacementService.create_or_update_placement_score(user.id, progress)
                logger.info(f"Successfully marked '{question_id}' as completed in user progress")

    return {
        "passed": passed,
        "stdout": stdout,
        "stderr": stderr,
        "compile_output": compile_output,
        "status_description": status_desc
    }
