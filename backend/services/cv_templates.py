"""
CV template library for Loophire PDF export.

Templates:
  classic     – Two-pane layout with dates on the right and section rules.
  minimal     – Clean single column with subtle rules.
  two_column  – Skills/contact sidebar left, main content right.
  compact     – Dense single column, small margins, max content.
"""
import re


# ─── Shared LaTeX utilities ───────────────────────────────────────────────────

_ESCAPE_CHARS = {
    '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#',
    '_': r'\_', '{': r'\{', '}': r'\}',
    '~': r'\textasciitilde{}', '^': r'\^{}',
}

def _escape(text: str) -> str:
    """Escape special LaTeX chars in plain text (no embedded commands)."""
    if not text:
        return ''
    return ''.join(_ESCAPE_CHARS.get(c, c) for c in text)


def _escape_cmd(text: str) -> str:
    """
    Escape special LaTeX chars while preserving existing \\command{...} groups
    already present in the text (e.g. injected \\href commands).
    """
    if not text:
        return ''
    result = []
    i = 0
    while i < len(text):
        if text[i] == '\\':
            j = i + 1
            while j < len(text) and text[j].isalpha():
                j += 1
            result.append(text[i:j])
            i = j
            while i < len(text) and text[i] == '{':
                depth = 0
                result.append(text[i])
                i += 1
                while i < len(text):
                    c = text[i]
                    if c == '{':
                        depth += 1
                        result.append(c)
                        i += 1
                    elif c == '}':
                        if depth == 0:
                            result.append(c)
                            i += 1
                            break
                        depth -= 1
                        result.append(c)
                        i += 1
                    else:
                        result.append(c)
                        i += 1
        else:
            result.append(_ESCAPE_CHARS.get(text[i], text[i]))
            i += 1
    return ''.join(result)


_KNOWN_LIVE_SITES = {
    "roleprint.xyz":  "https://www.roleprint.xyz/",
    "finpipe.xyz":    "https://finpipe.xyz/",
    "loophire.xyz":   "https://loophire.xyz",
    "hamzalatif.xyz": "https://hamzalatif.xyz",
}

_KNOWN_GITHUB = {
    "roleprint": "https://github.com/HamzaLatif02/roleprint",
    "finpipe":   "https://github.com/HamzaLatif02/finpipe",
    "legal":     "https://github.com/HamzaLatif02/llm_chronological_legal_benchmark",
    "deepfake":  "https://github.com/HamzaLatif02/DeepfakeDetection",
    "loophire":  "https://github.com/HamzaLatif02/loophire",
}


def _linkify_sites(text: str) -> str:
    for domain, url in _KNOWN_LIVE_SITES.items():
        pattern = r'(?<!://)(?<!\w)' + re.escape(domain) + r'(?!\w)'
        text = re.sub(
            pattern,
            lambda m, d=domain, u=url: rf'\href{{{u}}}{{\textcolor{{blue}}{{\underline{{{d}}}}}}}',
            text,
        )
    return text


def _linkify_urls(text: str) -> str:
    def rep(m):
        url = m.group(1)
        display = re.sub(r'^https?://', '', url)
        return rf'\href{{{url}}}{{\textcolor{{blue}}{{\underline{{{display}}}}}}}'
    return re.sub(r'(https?://[^\s\),\]\'\"\\\{\}]+)', rep, text)


def _process(text: str) -> str:
    """Full linkify + escape pipeline for bullet/paragraph text."""
    text = _linkify_sites(text)
    text = _linkify_urls(text)
    text = _escape_cmd(text)
    return text


def _gh_url(name: str, provided: str = '') -> str:
    if provided and provided.startswith('https://github.com'):
        return provided
    n = name.lower().replace(' ', '')
    for k, v in _KNOWN_GITHUB.items():
        if k in n:
            return v
    return ''


# ─── Template 1: Classic ──────────────────────────────────────────────────────

_CLASSIC_PREAMBLE = r"""\documentclass[10pt, letterpaper]{article}
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
    \sbox\ANDbox{$|$}"""


def _build_classic(d: dict) -> str:
    experience_latex = ""
    for exp in d.get("experience", []):
        bullets = "\n".join(
            f"                \\item {_process(b)}" for b in exp.get("highlights", [])
        )
        experience_latex += f"""
    \\begin{{twocolentry}}{{
        {_escape(exp.get("dates", ""))}
    }}
        \\textbf{{{_escape(exp.get("title", ""))}}}, {_escape(exp.get("company", ""))}\\end{{twocolentry}}

    \\vspace{{0.10 cm}}
    \\begin{{onecolentry}}
        \\begin{{highlights}}
{bullets}
        \\end{{highlights}}
    \\end{{onecolentry}}

    \\vspace{{0.2 cm}}
    """

    projects_latex = ""
    for proj in d.get("projects", []):
        bullets = "\n".join(
            f"                \\item {_process(b)}" for b in proj.get("highlights", [])
        )
        gh = _gh_url(proj.get("name", ""), proj.get("github_url", ""))
        gh_link = (
            f"\\href{{{gh}}}{{\\textcolor{{blue}}{{\\underline{{Github Repo}}}}}}" if gh else ""
        )
        projects_latex += f"""
    \\begin{{twocolentry}}{{
        {gh_link}
    }}
        \\textbf{{{_escape(proj.get("name", ""))}}}\\end{{twocolentry}}

    \\vspace{{0.10 cm}}
    \\begin{{onecolentry}}
        \\begin{{highlights}}
{bullets}
        \\end{{highlights}}
    \\end{{onecolentry}}
    \\vspace{{0.2 cm}}
    """

    skills_latex = "\n".join(
        f"                \\item \\textbf{{{_escape(s.get('category', ''))}:}} {_escape(s.get('items', ''))}"
        for s in d.get("technical_skills", [])
    )

    education_latex = ""
    for edu in d.get("education", []):
        bullets = "\n".join(
            f"                \\item {_process(b)}" for b in edu.get("highlights", [])
        )
        education_latex += f"""
    \\begin{{twocolentry}}{{
        {_escape(edu.get("dates", ""))}
    }}
        \\textbf{{{_escape(edu.get("institution", ""))}}}, {_escape(edu.get("degree", ""))}\\end{{twocolentry}}

    \\vspace{{0.10 cm}}
    \\begin{{onecolentry}}
        \\begin{{highlights}}
{bullets}
        \\end{{highlights}}
    \\end{{onecolentry}}

    \\vspace{{0.2 cm}}
    """

    profile_latex = _process(d.get("profile", ""))

    return (
        _CLASSIC_PREAMBLE
        + r"""

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
        + profile_latex
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


# ─── Template 2: Minimal ─────────────────────────────────────────────────────

def _build_minimal(d: dict) -> str:
    experience_latex = ""
    for exp in d.get("experience", []):
        bullets = "\n".join(
            f"  \\item {_process(b)}" for b in exp.get("highlights", [])
        )
        experience_latex += f"""
\\textbf{{{_escape(exp.get('title',''))}}} \\hfill \\textit{{{_escape(exp.get('dates',''))}}}\\\\
\\textit{{{_escape(exp.get('company',''))}}}
\\begin{{itemize}}[leftmargin=*,topsep=2pt,itemsep=1pt,parsep=0pt]
{bullets}
\\end{{itemize}}
\\vspace{{4pt}}
"""

    projects_latex = ""
    for proj in d.get("projects", []):
        bullets = "\n".join(
            f"  \\item {_process(b)}" for b in proj.get("highlights", [])
        )
        gh = _gh_url(proj.get("name", ""), proj.get("github_url", ""))
        gh_part = f" \\hfill \\href{{{gh}}}{{\\small Github}}" if gh else ""
        projects_latex += f"""
\\textbf{{{_escape(proj.get('name',''))}}}{gh_part}
\\begin{{itemize}}[leftmargin=*,topsep=2pt,itemsep=1pt,parsep=0pt]
{bullets}
\\end{{itemize}}
\\vspace{{4pt}}
"""

    education_latex = ""
    for edu in d.get("education", []):
        highlights = " \\textbar\\ ".join(_escape(h) for h in edu.get("highlights", []))
        education_latex += f"""
\\textbf{{{_escape(edu.get('institution',''))}}} \\hfill \\textit{{{_escape(edu.get('dates',''))}}}\\\\
{_escape(edu.get('degree',''))}\\\\
\\textit{{\\small {highlights}}}\\\\[4pt]
"""

    skills = " \\textbar\\ ".join(
        f"\\textbf{{{_escape(s['category'])}}}: {_escape(s['items'])}"
        for s in d.get("technical_skills", [])
    )

    return (
        r"""\documentclass[11pt,a4paper]{article}
\usepackage[top=1.8cm,bottom=1.8cm,left=2.2cm,right=2.2cm]{geometry}
\usepackage{hyperref,xcolor,enumitem,titlesec}
\usepackage[T1]{fontenc}\usepackage[utf8]{inputenc}
\IfFileExists{lmodern.sty}{\usepackage{lmodern}}{}
\hypersetup{colorlinks=true,urlcolor=blue,linkcolor=blue}
\titleformat{\section}{\large\bfseries}{}{0em}{}[\vspace{1pt}\titlerule]
\titlespacing{\section}{0pt}{10pt}{4pt}
\setlength{\parindent}{0pt}\pagestyle{empty}
\begin{document}
\begin{center}
{\LARGE\bfseries Hamza Latif}\\[4pt]
{\small lhamza1020@gmail.com\ \textbar\ 07907411957\ \textbar\
\href{https://www.linkedin.com/in/latif-hamza/}{\textcolor{blue}{\underline{LinkedIn}}}\ \textbar\
\href{https://github.com/HamzaLatif02}{\textcolor{blue}{\underline{Github}}}\ \textbar\
\href{https://hamzalatif.xyz}{\textcolor{blue}{\underline{hamzalatif.xyz}}}}
\end{center}
\noindent\rule{\linewidth}{0.6pt}
\vspace{2pt}
"""
        + f"""
\\section*{{Profile}}
{_process(d.get('profile',''))}

\\noindent\\rule{{\\linewidth}}{{0.3pt}}
\\section*{{Technical Skills}}
\\small {skills}

\\noindent\\rule{{\\linewidth}}{{0.3pt}}
\\section*{{Education}}
{education_latex}
\\noindent\\rule{{\\linewidth}}{{0.3pt}}
\\section*{{Experience}}
{experience_latex}
\\noindent\\rule{{\\linewidth}}{{0.3pt}}
\\section*{{Projects}}
{projects_latex}
\\noindent\\rule{{\\linewidth}}{{0.3pt}}
\\section*{{Languages}}
English (Fluent) \\textbar\\ Italian (Native) \\textbar\\
Urdu (Native) \\textbar\\ Hindi (Native) \\textbar\\ Punjabi (Native)

\\end{{document}}"""
    )


# ─── Template 3: Two Column ───────────────────────────────────────────────────

def _build_two_column(d: dict) -> str:
    skills_items = "\n".join(
        f"\\textbf{{\\small {_escape(s['category'])}}}:\\\\\n"
        f"\\scriptsize {_escape(s['items'])}\\\\[3pt]"
        for s in d.get("technical_skills", [])
    )

    edu_items = ""
    for edu in d.get("education", []):
        edu_items += (
            f"\\textbf{{\\small {_escape(edu.get('institution',''))}}}\\\\[1pt]\n"
            f"\\scriptsize {_escape(edu.get('degree',''))}\\\\[1pt]\n"
            f"\\textit{{\\scriptsize {_escape(edu.get('dates',''))}}}\\\\[4pt]\n"
        )

    experience_latex = ""
    for exp in d.get("experience", []):
        bullets = "\n".join(
            f"    \\item {_process(b)}" for b in exp.get("highlights", [])
        )
        experience_latex += f"""
{{\\small\\textbf{{{_escape(exp.get('title',''))}}}}} \\hfill {{\\textit{{\\scriptsize {_escape(exp.get('dates',''))}}}}}\\\\
{{\\small\\textit{{{_escape(exp.get('company',''))}}}}}
\\begin{{itemize}}[leftmargin=*,topsep=1pt,itemsep=0pt,parsep=0pt]
\\small
{bullets}
\\end{{itemize}}
\\vspace{{3pt}}
"""

    projects_latex = ""
    for proj in d.get("projects", []):
        bullets = "\n".join(
            f"    \\item {_process(b)}" for b in proj.get("highlights", [])
        )
        gh = _gh_url(proj.get("name", ""), proj.get("github_url", ""))
        gh_part = f" \\hfill \\href{{{gh}}}{{\\scriptsize Github}}" if gh else ""
        projects_latex += f"""
{{\\small\\textbf{{{_escape(proj.get('name',''))}}}}} {gh_part}
\\begin{{itemize}}[leftmargin=*,topsep=1pt,itemsep=0pt,parsep=0pt]
\\small
{bullets}
\\end{{itemize}}
\\vspace{{3pt}}
"""

    return (
        r"""\documentclass[10pt,a4paper]{article}
\usepackage[top=1.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm]{geometry}
\usepackage{hyperref,xcolor,enumitem,titlesec}
\usepackage[T1]{fontenc}\usepackage[utf8]{inputenc}
\IfFileExists{lmodern.sty}{\usepackage{lmodern}}{}
\definecolor{accent}{RGB}{253,90,4}
\hypersetup{colorlinks=true,urlcolor=accent,linkcolor=accent}
\setlength{\parindent}{0pt}\pagestyle{empty}
\titleformat{\section}{\small\bfseries\color{accent}}{}{0em}{}[\vspace{-2pt}{\color{accent}\rule{\linewidth}{0.5pt}}]
\titlespacing{\section}{0pt}{8pt}{4pt}
\begin{document}
\begin{minipage}[t]{0.32\textwidth}
\vspace{0pt}
{\large\bfseries Hamza Latif}\\[4pt]
{\scriptsize
lhamza1020@gmail.com\\[2pt]
07907411957\\[2pt]
\href{https://www.linkedin.com/in/latif-hamza/}{\textcolor{accent}{\underline{LinkedIn}}}\\[2pt]
\href{https://github.com/HamzaLatif02}{\textcolor{accent}{\underline{HamzaLatif02}}}\\[2pt]
\href{https://hamzalatif.xyz}{\textcolor{accent}{\underline{hamzalatif.xyz}}}\\[8pt]
}
{\small\bfseries\color{accent} SKILLS}\\[4pt]
"""
        + skills_items
        + r"""
\vspace{4pt}
{\small\bfseries\color{accent} EDUCATION}\\[4pt]
"""
        + edu_items
        + r"""
\vspace{4pt}
{\small\bfseries\color{accent} LANGUAGES}\\[4pt]
{\scriptsize English \textbullet\ Italian \textbullet\ Urdu \textbullet\ Hindi \textbullet\ Punjabi}
\end{minipage}%
\hfill
\begin{minipage}[t]{0.65\textwidth}
\vspace{0pt}
\section{Profile}
\small """
        + _process(d.get("profile", ""))
        + r"""
\section{Experience}
"""
        + experience_latex
        + r"""
\section{Projects}
"""
        + projects_latex
        + r"""
\end{minipage}
\end{document}"""
    )


# ─── Template 4: Compact ─────────────────────────────────────────────────────

def _build_compact(d: dict) -> str:
    experience_latex = ""
    for exp in d.get("experience", []):
        bullets = "\n".join(
            f"  \\item {_process(b)}" for b in exp.get("highlights", [])
        )
        experience_latex += f"""
\\textbf{{{_escape(exp.get('title',''))}}} at \\textit{{{_escape(exp.get('company',''))}}} \\hfill {{\\footnotesize {_escape(exp.get('dates',''))}}}
\\begin{{itemize}}[leftmargin=*,topsep=1pt,itemsep=0pt,parsep=0pt]
\\small
{bullets}
\\end{{itemize}}
"""

    projects_latex = ""
    for proj in d.get("projects", []):
        bullets = "\n".join(
            f"  \\item {_process(b)}" for b in proj.get("highlights", [])
        )
        gh = _gh_url(proj.get("name", ""), proj.get("github_url", ""))
        gh_part = f" \\href{{{gh}}}{{\\footnotesize [github]}}" if gh else ""
        projects_latex += f"""
\\textbf{{{_escape(proj.get('name',''))}}}{gh_part}
\\begin{{itemize}}[leftmargin=*,topsep=1pt,itemsep=0pt,parsep=0pt]
\\small
{bullets}
\\end{{itemize}}
"""

    edu_latex = " \\quad ".join(
        f"\\textbf{{{_escape(e.get('institution',''))}}} "
        f"{_escape(e.get('degree',''))} "
        f"({_escape(e.get('dates',''))})"
        for e in d.get("education", [])
    )

    skills = " | ".join(
        f"\\textbf{{{_escape(s['category'])}}}: {_escape(s['items'])}"
        for s in d.get("technical_skills", [])
    )

    return (
        r"""\documentclass[9pt,a4paper]{article}
\usepackage[top=1.2cm,bottom=1.2cm,left=1.5cm,right=1.5cm]{geometry}
\usepackage{hyperref,xcolor,enumitem,titlesec}
\usepackage[T1]{fontenc}\usepackage[utf8]{inputenc}
\IfFileExists{lmodern.sty}{\usepackage{lmodern}}{}
\hypersetup{colorlinks=true,urlcolor=blue,linkcolor=blue}
\titleformat{\section}{\normalsize\bfseries}{}{0em}{\uppercase}[\vspace{-4pt}\rule{\linewidth}{0.4pt}]
\titlespacing{\section}{0pt}{6pt}{2pt}
\setlength{\parindent}{0pt}\pagestyle{empty}
\begin{document}
{\centering
{\Large\bfseries Hamza Latif}\\[2pt]
{\footnotesize lhamza1020@gmail.com\ |\ 07907411957\ |\
\href{https://www.linkedin.com/in/latif-hamza/}{\textcolor{blue}{\underline{LinkedIn}}}\ |\
\href{https://github.com/HamzaLatif02}{\textcolor{blue}{\underline{Github}}}\ |\
\href{https://hamzalatif.xyz}{\textcolor{blue}{\underline{hamzalatif.xyz}}}\\}
\par}
\vspace{2pt}
"""
        + f"""
\\section{{Profile}}
\\small {_process(d.get('profile',''))}

\\section{{Education}}
\\small {edu_latex}

\\section{{Skills}}
\\footnotesize {skills}

\\section{{Experience}}
{experience_latex}

\\section{{Projects}}
{projects_latex}

\\section{{Languages}}
\\small English (Fluent) | Italian (Native) | Urdu (Native) |
Hindi (Native) | Punjabi (Native)
\\end{{document}}"""
    )


# ─── Auto-detector ───────────────────────────────────────────────────────────

def detect_template(cv_text: str) -> str:
    """
    Analyse CV text heuristics and return the closest template ID.
    Never returns "auto" — always resolves to a concrete template.
    """
    if not cv_text:
        return "classic"

    lines = [l for l in cv_text.split("\n") if l.strip()]
    if not lines:
        return "classic"

    total_lines  = len(lines)
    total_words  = len(cv_text.split())
    avg_line_len = sum(len(l) for l in lines) / total_lines
    short_lines  = sum(1 for l in lines if len(l.strip()) < 20)
    short_ratio  = short_lines / total_lines

    # Many short lines suggests sidebar content
    if short_ratio > 0.45 and avg_line_len < 35:
        return "two_column"

    # Very high word density suggests compact layout
    words_per_line = total_words / total_lines
    if words_per_line > 12 and total_lines > 60:
        return "compact"

    # Moderate density with clear section headers suggests minimal
    section_markers = sum(
        1 for l in lines if l.strip().isupper() and 2 < len(l.strip()) < 30
    )
    if section_markers >= 4 and avg_line_len > 30:
        return "minimal"

    return "classic"


# ─── Registry ────────────────────────────────────────────────────────────────

TEMPLATES = {
    "classic": {
        "id":          "classic",
        "name":        "Classic",
        "description": "Two-pane layout with dates on the right and section rules.",
        "preview":     "Two column · Section rules · Charter font",
        "builder":     _build_classic,
    },
    "minimal": {
        "id":          "minimal",
        "name":        "Minimal",
        "description": "Clean single column with subtle rules. Professional and easy to read.",
        "preview":     "Single column · Minimal rules · Modern",
        "builder":     _build_minimal,
    },
    "two_column": {
        "id":          "two_column",
        "name":        "Two Column",
        "description": "Skills and contact sidebar on the left, main content on the right.",
        "preview":     "Sidebar layout · Orange accent · Compact",
        "builder":     _build_two_column,
    },
    "compact": {
        "id":          "compact",
        "name":        "Compact",
        "description": "Dense single column with small margins. Fits more content on one page.",
        "preview":     "Dense layout · Small font · Max content",
        "builder":     _build_compact,
    },
}


def build_latex_for_template(template_id: str, content: dict) -> str:
    """Build a complete LaTeX document string for the given template and CV content."""
    tmpl = TEMPLATES.get(template_id, TEMPLATES["classic"])
    return tmpl["builder"](content)
