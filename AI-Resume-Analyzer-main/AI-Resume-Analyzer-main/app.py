from fastapi import FastAPI, File, Header, HTTPException, UploadFile
import os
import re
import shutil
import tempfile
from typing import Optional

from pdfminer.high_level import extract_text

try:
    from pyresparser import ResumeParser as PyResumeParser
except Exception:
    PyResumeParser = None

app = FastAPI()


MAX_FILE_SIZE_BYTES = int(os.getenv("RESUME_PARSER_MAX_FILE_SIZE_BYTES", str(10 * 1024 * 1024)))
ALLOW_ONLY_PDF = os.getenv("RESUME_PARSER_ALLOW_ONLY_PDF", "true").lower() in {"1", "true", "yes", "on"}
API_KEY = os.getenv("RESUME_PARSER_API_KEY", "").strip()


COMMON_SKILLS = [
    "javascript", "typescript", "react", "node", "node.js", "python", "java", "go", "rust",
    "sql", "postgresql", "mongodb", "redis", "docker", "kubernetes", "aws", "gcp", "azure",
    "git", "graphql", "rest", "html", "css", "tailwind", "next", "next.js", "vue", "angular",
    "spring", "django", "fastapi", "c++", "c#", "swift", "kotlin", "flutter", "tensorflow",
    "pytorch", "pandas", "numpy", "machine learning",
    "cloud security", "penetration testing", "iam", "zero trust", "devsecops",
    "siem", "soc", "nmap", "burp suite", "owasp", "kali linux",
    "terraform", "ansible", "linux", "bash", "powershell", "jenkins", "ci/cd",
]


def _dedupe_list(values):
    seen = set()
    out = []
    for value in values:
        text = str(value).strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(text)
    return out


def _section_lines(lines, header_words, max_lines=10):
    headers = {h.lower() for h in header_words}
    idx = next((i for i, line in enumerate(lines) if line.lower() in headers), -1)
    if idx == -1:
        return []

    stop_headers = {
        "skills",
        "technical skills",
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "education",
        "academic background",
        "projects",
        "certifications",
    }

    out = []
    for i in range(idx + 1, min(len(lines), idx + 1 + max_lines)):
        lower = lines[i].lower()
        if lower in stop_headers:
            break
        out.append(lines[i])
    return out


def _fallback_parse(file_path: str):
    text = extract_text(file_path) or ""
    text_lower = text.lower()

    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    email = email_match.group(0) if email_match else None

    lines = [line.strip() for line in re.split(r"\r?\n", text) if line and line.strip()]
    name = None
    for line in lines[:8]:
        if 2 < len(line) < 60 and re.search(r"[A-Za-z]", line):
            name = line
            break

    matched_skills = []
    for skill in COMMON_SKILLS:
        if skill in text_lower:
            matched_skills.append(skill)

    inline_skills = []
    for line in lines:
        lower = line.lower()
        if "skills" in lower and ":" in line:
            rhs = line.split(":", 1)[1]
            inline_skills.extend([
                x.strip() for x in re.split(r"[|,;/•·]", rhs) if x and x.strip()
            ])

    # Preserve readable casing
    normalized_skills = sorted(set(
        [s.title() if len(s) > 3 else s.upper() for s in matched_skills] + inline_skills
    ))

    exp_lines = _section_lines(
        lines,
        {"experience", "work experience", "professional experience", "employment history"},
        max_lines=16,
    )
    date_role_lines = [
        line for line in lines
        if re.search(r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}.*(present|current|\d{4})", line.lower())
        or re.search(r"(engineer|developer|analyst|manager|intern|consultant|specialist)", line.lower())
    ]
    exp_lines = _dedupe_list(exp_lines + date_role_lines[:12])[:18]
    edu_lines = _section_lines(lines, {"education", "academic background"}, max_lines=12)

    return {
        "name": name,
        "email": email,
        "skills": normalized_skills,
        "experience": exp_lines,
        "education": edu_lines,
        "source": "python-fallback",
    }


@app.get("/health")
def health():
    return {
        "ok": True,
        "max_file_size_bytes": MAX_FILE_SIZE_BYTES,
        "allow_only_pdf": ALLOW_ONLY_PDF,
        "pyresparser_enabled": PyResumeParser is not None,
    }


@app.post("/parse")
async def parse_resume(
    file: UploadFile = File(...),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid parser API key")

    if ALLOW_ONLY_PDF and file.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=415, detail="Only PDF files are supported")

    suffix = os.path.splitext(file.filename or "resume.pdf")[1] or ".pdf"
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = tmp.name
            shutil.copyfileobj(file.file, tmp)

        file_size = os.path.getsize(temp_path)
        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max allowed size is {MAX_FILE_SIZE_BYTES} bytes",
            )

        if PyResumeParser is not None:
            try:
                data = PyResumeParser(temp_path).get_extracted_data()
                fallback_data = _fallback_parse(temp_path)

                py_skills = data.get("skills") or []
                fb_skills = fallback_data.get("skills") or []
                skills = _dedupe_list(list(py_skills) + list(fb_skills))

                total_experience = data.get("total_experience")
                experience = []
                if total_experience not in (None, "", 0):
                    experience.append({"total_years": total_experience})

                fb_experience = fallback_data.get("experience") or []
                experience.extend(_dedupe_list(fb_experience))

                py_education = data.get("degree") or []
                fb_education = fallback_data.get("education") or []
                education = _dedupe_list(list(py_education) + list(fb_education))

                return {
                    "name": data.get("name") or fallback_data.get("name"),
                    "email": data.get("email") or fallback_data.get("email"),
                    "skills": skills,
                    "experience": experience,
                    "education": education,
                    "source": "pyresparser",
                }
            except Exception:
                # Fall back to robust local parser instead of failing request.
                pass

        return _fallback_parse(temp_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {exc}")
    finally:
        try:
            await file.close()
        except Exception:
            pass

        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
