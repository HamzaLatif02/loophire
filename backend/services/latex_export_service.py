import logging
import os
import re
import subprocess
import tempfile

logger = logging.getLogger(__name__)

# Fallback GitHub URLs keyed by lowercase project-name fragment
KNOWN_PROJECT_URLS = {
    "loophire": "https://github.com/HamzaLatif02/loophire",
}

# Bare domain names that may appear in bullet text without a scheme
KNOWN_LIVE_SITES = {
    "loophire.xyz": "https://loophire.xyz",
    "hamzalatif.xyz": "https://hamzalatif.xyz",
}


def generate_cv_pdf(tailored_content: dict) -> bytes:
    """
    Render a structured CV dict as a PDF using Hamza's LaTeX template.

    tailored_content keys:
      profile          str
      technical_skills list of {category, items}
      education        list of {institution, degree, dates, highlights}
      experience       list of {title, company, dates, highlights}
      projects         list of {name, github_url, live_url, highlights}
    """
    latex = build_latex(tailored_content)

    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "cv.tex")
        pdf_path = os.path.join(tmpdir, "cv.pdf")

        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex)

        result = None
        for _ in range(2):
            result = subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, tex_path],
                capture_output=True,
                text=True,
                timeout=60,
            )

        if not os.path.exists(pdf_path):
            logger.error(
                "pdflatex failed.\nSTDOUT: %s\nSTDERR: %s",
                result.stdout if result else "",
                result.stderr if result else "",
            )
            raise RuntimeError(
                f"PDF generation failed.\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}"
            )

        with open(pdf_path, "rb") as f:
            return f.read()


def escape_latex(text: str) -> str:
    """Escape special LaTeX characters in plain text (no embedded commands)."""
    chars = {
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\^{}",
        "\\": r"\textbackslash{}",
    }
    return "".join(chars.get(c, c) for c in text)


def get_project_github_url(proj: dict) -> str:
    """Return github_url from proj, falling back to KNOWN_PROJECT_URLS by name."""
    url = proj.get("github_url", "")
    if url:
        return url
    name = proj.get("name", "").lower()
    for key, known_url in KNOWN_PROJECT_URLS.items():
        if key in name:
            return known_url
    return ""


def linkify_live_sites(text: str) -> str:
    """
    Wrap known bare domain names in \\href commands.
    Skips domains already preceded by '://' (handled by linkify_urls_in_text).
    """
    for domain, url in KNOWN_LIVE_SITES.items():
        pattern = r'(?<!://)(?<!\w)' + re.escape(domain) + r'(?!\w)'
        replacement = lambda m, d=domain, u=url: (
            rf'\href{{{u}}}{{\textcolor{{blue}}{{\underline{{{d}}}}}}}'
        )
        text = re.sub(pattern, replacement, text)
    return text


def linkify_urls_in_text(text: str) -> str:
    """
    Wrap bare https?:// URLs in \\href commands.
    Excludes {} from the URL match so existing \\href contents are not re-matched.
    """
    def _replace(m):
        url = m.group(1)
        display = re.sub(r'^https?://', '', url)
        return rf'\href{{{url}}}{{\textcolor{{blue}}{{\underline{{{display}}}}}}}'

    return re.sub(r'(https?://[^\s\),\]\'\"\\\{\}]+)', _replace, text)


def escape_latex_outside_commands(text: str) -> str:
    """
    Escape LaTeX special characters in text, skipping the content of
    \\command{...}{...} brace groups so that injected \\href commands survive.
    """
    chars = {
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\^{}",
        "\\": r"\textbackslash{}",
    }
    result = []
    i = 0
    while i < len(text):
        if text[i] == '\\':
            # Read the command name (letters only)
            j = i + 1
            while j < len(text) and text[j].isalpha():
                j += 1
            result.append(text[i:j])
            i = j
            # Consume ALL consecutive brace groups after the command
            while i < len(text) and text[i] == '{':
                depth = 0
                result.append(text[i])  # opening {
                i += 1
                while i < len(text):
                    c = text[i]
                    if c == '{':
                        depth += 1
                        result.append(c)
                        i += 1
                    elif c == '}':
                        if depth == 0:
                            result.append(c)  # matching closing }
                            i += 1
                            break
                        depth -= 1
                        result.append(c)
                        i += 1
                    else:
                        result.append(c)
                        i += 1
        else:
            result.append(chars.get(text[i], text[i]))
            i += 1
    return "".join(result)


def process_bullet(text: str) -> str:
    """Full pipeline: linkify known sites → linkify URLs → escape outside commands."""
    text = linkify_live_sites(text)
    text = linkify_urls_in_text(text)
    text = escape_latex_outside_commands(text)
    return text


def build_latex(d: dict) -> str:
    # Experience
    experience_latex = ""
    for exp in d.get("experience", []):
        bullets = "\n".join(
            f"                \\item {process_bullet(b)}" for b in exp.get("highlights", [])
        )
        experience_latex += f"""
    \\begin{{twocolentry}}{{
        {escape_latex(exp.get("dates", ""))}
    }}
        \\textbf{{{escape_latex(exp.get("title", ""))}}}, {escape_latex(exp.get("company", ""))}\\end{{twocolentry}}

    \\vspace{{0.10 cm}}
    \\begin{{onecolentry}}
        \\begin{{highlights}}
{bullets}
        \\end{{highlights}}
    \\end{{onecolentry}}

    \\vspace{{0.2 cm}}
    """

    # Projects
    projects_latex = ""
    for proj in d.get("projects", []):
        bullets = "\n".join(
            f"                \\item {process_bullet(b)}" for b in proj.get("highlights", [])
        )
        github_url = get_project_github_url(proj)
        github_link = (
            f"\\href{{{github_url}}}{{\\textcolor{{blue}}{{\\underline{{Github Repo}}}}}}"
            if github_url
            else ""
        )
        projects_latex += f"""
    \\begin{{twocolentry}}{{
        {github_link}
    }}
        \\textbf{{{escape_latex(proj.get("name", ""))}}}\\end{{twocolentry}}

    \\vspace{{0.10 cm}}
    \\begin{{onecolentry}}
        \\begin{{highlights}}
{bullets}
        \\end{{highlights}}
    \\end{{onecolentry}}
    \\vspace{{0.2 cm}}
    """

    # Technical skills
    skills_latex = "\n".join(
        f"                \\item \\textbf{{{escape_latex(s.get('category', ''))}:}} "
        f"{escape_latex(s.get('items', ''))}"
        for s in d.get("technical_skills", [])
    )

    # Education
    education_latex = ""
    for edu in d.get("education", []):
        bullets = "\n".join(
            f"                \\item {process_bullet(b)}" for b in edu.get("highlights", [])
        )
        education_latex += f"""
    \\begin{{twocolentry}}{{
        {escape_latex(edu.get("dates", ""))}
    }}
        \\textbf{{{escape_latex(edu.get("institution", ""))}}}, {escape_latex(edu.get("degree", ""))}\\end{{twocolentry}}

    \\vspace{{0.10 cm}}
    \\begin{{onecolentry}}
        \\begin{{highlights}}
{bullets}
        \\end{{highlights}}
    \\end{{onecolentry}}

    \\vspace{{0.2 cm}}
    """

    profile_processed = process_bullet(d.get("profile", ""))

    return (
        r"""
\documentclass[10pt, letterpaper]{article}
\usepackage[ignoreheadfoot,top=2cm,bottom=2cm,left=2cm,right=2cm,footskip=1.0cm]{geometry}
\usepackage{titlesec}
\usepackage{tabularx}
\usepackage{array}
\usepackage[dvipsnames]{xcolor}
\definecolor{primaryColor}{RGB}{0, 0, 0}
\usepackage{enumitem}
\usepackage{fontawesome5}
\usepackage{amsmath}
\usepackage[pdftitle={Hamza Latif's CV},pdfauthor={Hamza Latif},colorlinks=true,urlcolor=blue,linkcolor=blue,filecolor=blue]{hyperref}
\usepackage[pscoord]{eso-pic}
\usepackage{calc}
\usepackage{bookmark}
\usepackage{lastpage}
\usepackage{changepage}
\usepackage{paracol}
\usepackage{ifthen}
\usepackage{needspace}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{iftex}
\ifPDFTeX
    \input{glyphtounicode}
    \pdfgentounicode=1
    \IfFileExists{lmodern.sty}{\usepackage{lmodern}}{}
\fi
\usepackage{charter}
\raggedright
\AtBeginEnvironment{adjustwidth}{\partopsep0pt}
\pagestyle{empty}
\setcounter{secnumdepth}{0}
\setlength{\parindent}{0pt}
\setlength{\topskip}{0pt}
\setlength{\columnsep}{0.15cm}
\pagenumbering{gobble}
\titleformat{\section}{\needspace{4\baselineskip}\bfseries\large}{}{0pt}{}[\vspace{1pt}\titlerule]
\titlespacing{\section}{-1pt}{0.3cm}{0.2cm}
\renewcommand\labelitemi{$\vcenter{\hbox{\small$\bullet$}}$}
\newenvironment{highlights}{\begin{itemize}[topsep=0.10cm,parsep=0.10cm,partopsep=0pt,itemsep=0pt,leftmargin=0cm+10pt]}{\end{itemize}}
\newenvironment{highlightsforbulletentries}{\begin{itemize}[topsep=0.10cm,parsep=0.10cm,partopsep=0pt,itemsep=0pt,leftmargin=10pt]}{\end{itemize}}
\newenvironment{onecolentry}{\begin{adjustwidth}{0cm+0.00001cm}{0cm+0.00001cm}}{\end{adjustwidth}}
\newenvironment{twocolentry}[2][]{\onecolentry\def\secondColumn{#2}\setcolumnwidth{\fill,4.5cm}\begin{paracol}{2}}{\switchcolumn\raggedleft\secondColumn\end{paracol}\endonecolentry}
\newenvironment{header}{\setlength{\topsep}{0pt}\par\kern\topsep\centering\linespread{1.5}}{\par\kern\topsep}
\let\hrefWithoutArrow\href

\begin{document}
    \newcommand{\AND}{\unskip\cleaders\copy\ANDbox\hskip\wd\ANDbox\ignorespaces}
    \newsavebox\ANDbox
    \sbox\ANDbox{$|$}

    \begin{header}
        \fontsize{25 pt}{25 pt}\selectfont Hamza Latif

        \vspace{5 pt}

        \normalsize
        \mbox{\hrefWithoutArrow{mailto:lhamza1020@gmail.com}{lhamza1020@gmail.com}}%
        \kern 5.0 pt%
        \AND%
        \kern 5.0 pt%
        \mbox{\hrefWithoutArrow{tel:+44 7907411957}{07907411957}}%
        \kern 5.0 pt%
        \AND%
        \kern 5.0 pt%
        \mbox{\hrefWithoutArrow{https://www.linkedin.com/in/latif-hamza/}{\textcolor{blue}{\underline{LinkedIn}}}}%
        \kern 5.0 pt%
        \AND%
        \kern 5.0 pt%
        \mbox{\hrefWithoutArrow{https://github.com/HamzaLatif02}{\textcolor{blue}{\underline{Github}}}}%
        \kern 5.0 pt%
        \AND%
        \kern 5.0 pt%
        \mbox{\hrefWithoutArrow{https://hamzalatif.xyz}{\textcolor{blue}{\underline{Website}}}}%
    \end{header}

    \vspace{5 pt - 0.3 cm}

    \section{Profile}
        \begin{onecolentry}
            """
        + profile_processed
        + r"""
        \end{onecolentry}

    \section{Technical Skills}
        \begin{onecolentry}
            \begin{highlights}
                """
        + skills_latex
        + r"""
            \end{highlights}
        \end{onecolentry}

    \section{Education}
        """
        + education_latex
        + r"""

    \section{Experience}
        """
        + experience_latex
        + r"""

    \section{Projects}
        """
        + projects_latex
        + r"""

    \section{Languages}
        \begin{onecolentry}
            English (Fluent), Italian (Native), Urdu (Native), Hindi (Native), Punjabi (Native)
        \end{onecolentry}

\end{document}
"""
    )
