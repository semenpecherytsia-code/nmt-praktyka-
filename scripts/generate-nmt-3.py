"""Набір «Симуляція НМТ №3»: 22 завдання від власника сайту (скриншоти з ключами), рисунки намальовано у SVG."""
import json, math, os, shutil

SID = "nmt-3"
OUT = f"public/content/sets/{SID}/"
P = "nmt3"
os.makedirs(OUT + "assets", exist_ok=True)
os.makedirs(OUT + "reference", exist_ok=True)
# Довідкові матеріали ті самі, що й у №23.
for f in ["page-1.png", "page-2.png", "page-3.png", "dovidkovi-materialy.pdf"]:
    shutil.copy("public/content/sets/nmt-23/reference/" + f, OUT + "reference/" + f)

INK = "#172033"
FONT = 'font-family="Times New Roman, Georgia, serif"'
DASH = 'stroke-dasharray="7 6"'


def svg(name, w, h, body):
    open(OUT + "assets/" + name, "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" {FONT}>'
        f'<rect width="{w}" height="{h}" fill="#ffffff"/>{body}</svg>\n')
    return {"src": "assets/" + name, "width": w, "height": h}


def txt(x, y, s, size=20, anchor="middle", italic=False, extra=""):
    st = ' font-style="italic"' if italic else ""
    return f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" text-anchor="{anchor}" fill="{INK}"{st} {extra}>{s}</text>'


def ln(a, b, w=2.4, dash=False, color=INK):
    return (f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{color}" '
            f'stroke-width="{w}" stroke-linecap="round"{" " + DASH if dash else ""}/>')


def dot(p, r=4.5):
    return f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r}" fill="{INK}"/>'


# ---------- рисунки ----------
def chart():
    months = ["травень", "червень", "липень", "серпень", "вересень"]
    vals = [0, -4000, -2000, 5000, 8000]
    x0, y0, w, h = 130, 25, 520, 400
    vmin, vmax = -6000, 10000
    Y = lambda v: y0 + (vmax - v) / (vmax - vmin) * h
    step = w / 5
    b = []
    for v in range(vmin, vmax + 1, 2000):
        b.append(ln((x0, Y(v)), (x0 + w, Y(v)), 1, color="#9AA5B5"))
        b.append(txt(x0 - 10, Y(v) + 6, str(v).replace("-", "−"), 17, "end"))
    for i in range(6):
        b.append(ln((x0 + step * i, y0), (x0 + step * i, y0 + h), 1, color="#9AA5B5"))
    b.append(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="none" stroke="{INK}" stroke-width="1.5"/>')
    b.append(ln((x0, Y(0)), (x0 + w, Y(0)), 1.8))
    for i, (m, v) in enumerate(zip(months, vals)):
        cx = x0 + step * i
        b.append(f'<circle cx="{cx:.1f}" cy="{Y(v):.1f}" r="7" fill="#1E9E5A" stroke="#ffffff" stroke-width="2"/>')
        b.append(txt(cx, y0 + h + 28, m, 17))
    b.append(txt(x0 + w / 2, y0 + h + 62, "Місяці", 19))
    b.append(txt(30, y0 + h / 2, "Зміна вартості EcoFlow, грн", 19, extra=f'transform="rotate(-90 30 {y0 + h / 2})"'))
    return svg("q02-chart.svg", 690, 500, "".join(b))


def pyramid():
    S, A, B, C, D = (240, 30), (70, 300), (175, 205), (380, 205), (275, 315)
    b = [ln(S, A), ln(S, C), ln(S, D), ln(A, D), ln(D, C),
         ln(S, B, 2, True), ln(A, B, 2, True), ln(B, C, 2, True)]
    b += [dot(p, 3.5) for p in (S, A, B, C, D)]
    b += [txt(S[0], S[1] - 10, "S", 24, italic=True), txt(A[0] - 16, A[1] + 12, "A", 24, italic=True),
          txt(B[0] - 18, B[1] - 4, "B", 24, italic=True), txt(C[0] + 18, C[1] + 6, "C", 24, italic=True),
          txt(D[0] + 4, D[1] + 28, "D", 24, italic=True)]
    return svg("q06-pyramid.svg", 430, 350, "".join(b))


def trapezoid():
    # Справжні розміри: AD = 40, AB = CD = 25, AC = 39, AH = 32, HC = 7.
    s, ox, oy = 9, 40, 250
    T = lambda x, y: (ox + x * s, oy - y * s)
    A, D, C, B = T(0, 0), T(40, 0), T(31.2, 23.4), T(8.8, 23.4)
    H = T(31.2 * 32 / 39, 23.4 * 32 / 39)
    # прямий кут при H
    ux, uy = (C[0] - A[0]) / math.dist(A, C), (C[1] - A[1]) / math.dist(A, C)
    vx, vy = (D[0] - H[0]) / math.dist(H, D), (D[1] - H[1]) / math.dist(H, D)
    k = 12
    p1, p2, p3 = (H[0] - ux * k, H[1] - uy * k), (H[0] - ux * k + vx * k, H[1] - uy * k + vy * k), (H[0] + vx * k, H[1] + vy * k)
    b = [f'<polygon points="{A[0]},{A[1]} {B[0]},{B[1]} {C[0]},{C[1]} {D[0]},{D[1]}" fill="none" stroke="{INK}" stroke-width="2.6"/>',
         ln(A, C), ln(D, H),
         f'<polyline points="{p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f} {p3[0]:.1f},{p3[1]:.1f}" fill="none" stroke="{INK}" stroke-width="1.6"/>',
         dot(H),
         txt(A[0] - 14, A[1] + 8, "A", 24, italic=True), txt(B[0] - 12, B[1] - 8, "B", 24, italic=True),
         txt(C[0] + 10, C[1] - 8, "C", 24, italic=True), txt(D[0] + 16, D[1] + 8, "D", 24, italic=True),
         txt(H[0] - 24, H[1] + 4, "H", 24, italic=True)]
    return svg("q14-trapezoid.svg", 460, 280, "".join(b))


def rhombus_triangle():
    r3 = math.sqrt(3)
    s, ox, oy = 15, 170, 90
    T = lambda x, y: (ox + x * s, oy - y * s)
    B, C, E = T(0, 0), T(8 * r3, 0), T(4 * r3, 4)
    A, D = T(-4 * r3, -12), T(4 * r3, -12)
    b = [ln(E, B), ln(E, C), ln(B, C), ln(B, A), ln(A, D), ln(D, C)]
    for P1, P2 in ((E, B), (E, C)):  # однакові риски на бічних сторонах
        mx, my = (P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2
        dx, dy = P2[0] - P1[0], P2[1] - P1[1]
        L = math.hypot(dx, dy)
        nx, ny = -dy / L * 7, dx / L * 7
        b.append(ln((mx - nx, my - ny), (mx + nx, my + ny), 2))
    b += [txt(E[0], E[1] - 12, "E", 24, italic=True), txt(B[0] - 18, B[1] + 2, "B", 24, italic=True),
          txt(C[0] + 18, C[1] + 6, "C", 24, italic=True), txt(A[0] - 10, A[1] + 26, "A", 24, italic=True),
          txt(D[0] + 6, D[1] + 26, "D", 24, italic=True)]
    return svg("q18-rhombus.svg", 420, 330, "".join(b))


def bottle(x, body, cap, label_fill, label_text, label_color, handle="#ffffff"):
    """Пляшка гелю для прання: корпус, ручка-виріз, кришка, кругла етикетка з назвою."""
    w, top, bot = 92, 70, 250
    l, r = x - w / 2, x + w / 2
    d = (f"M{l+8},{bot} Q{l},{bot} {l},{bot-12} L{l},{top+70} Q{l},{top+30} {x-20},{top+18} "
         f"L{x-20},{top} L{x+20},{top} L{x+20},{top+18} Q{r},{top+30} {r},{top+70} L{r},{bot-12} Q{r},{bot} {r-8},{bot} Z")
    return (f'<path d="{d}" fill="{body}" stroke="#2b2b2b" stroke-opacity=".35" stroke-width="1.5"/>'
            f'<rect x="{x-24}" y="{top-30}" width="48" height="34" rx="6" fill="{cap}"/>'
            f'<rect x="{x-24}" y="{top-30}" width="48" height="8" rx="4" fill="#000" fill-opacity=".12"/>'
            f'<path d="M{r-24},{top+50} q14,6 14,30 q0,22 -12,22 q-8,0 -8,-20 q0,-26 6,-32 z" fill="{handle}" fill-opacity=".85"/>'
            f'<circle cx="{x-4}" cy="{top+120}" r="38" fill="{label_fill}" stroke="#d1d5db" stroke-width="1.5"/>'
            f'<text x="{x-4}" y="{top+125}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="{15 if len(label_text) <= 7 else 12}" '
            f'text-anchor="middle" fill="{label_color}">{label_text}</text>'
            f'<path d="M{l+10},{top+80} L{l+10},{bot-20}" stroke="#ffffff" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>')


def gels():
    items = [("Ariel", "#2E9B3E", "#2E9B3E", "#ffffff", "ARIEL", "#1F7A2E", "#BFE3B4"),
             ("Persil", "#F4F6F8", "#D8262E", "#ffffff", "Persil", "#D8262E", "#F6E58D"),
             ("Perwoll", "#1E1E24", "#7E4BB5", "#3B2A55", "Perwoll", "#ffffff", "#C9B6E8"),
             ("Savex", "#1F7FD6", "#1F7FD6", "#ffffff", "Savex", "#D8262E", "#A9D3F5"),
             ("Coccolino", "#8CC4F2", "#E9EDF1", "#ffffff", "Coccolino", "#1F5FA8", "#D7C6EE")]
    b = []
    xs = [80, 210, 340, 470, 600]
    b.append('<rect x="14" y="250" width="652" height="60" rx="6" fill="#B9BEC5"/>')
    b.append('<rect x="14" y="250" width="652" height="10" rx="4" fill="#D4D8DD"/>')
    for x, (name, body, cap, lf, lt, lc, tag) in zip(xs, items):
        b.append(bottle(x, body, cap, lf, lt, lc))
        b.append(f'<rect x="{x-58}" y="264" width="116" height="36" rx="6" fill="{tag}" stroke="#6b7280" stroke-opacity=".4"/>')
        b.append(f'<text x="{x}" y="289" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" text-anchor="middle" fill="#1f2937">{name}</text>')
    # знизу вільне місце, щоб кнопка збільшення не закривала підписи
    return svg("q20-gels.svg", 680, 360, "".join(b))


def cylinder_prism():
    st = f'stroke="{INK}" stroke-width="2.4" fill="none"'
    cx, top, bot, rx, ry = 95, 50, 280, 60, 16
    b = [f'<ellipse cx="{cx}" cy="{top}" rx="{rx}" ry="{ry}" {st}/>',
         ln((cx - rx, top), (cx - rx, bot)), ln((cx + rx, top), (cx + rx, bot)),
         f'<path d="M{cx-rx},{bot} A{rx},{ry} 0 0 0 {cx+rx},{bot}" {st}/>',
         f'<path d="M{cx-rx},{bot} A{rx},{ry} 0 0 1 {cx+rx},{bot}" {st} {DASH}/>',
         ln((cx - rx, bot), (cx + rx, bot), 2, True), dot((cx, bot), 3.5)]
    # прямокутна (правильна чотирикутна) призма: основа — квадрат, зображено в косокутній проекції
    x0, a, dx, dy = 210, 120, 38, -30
    Pf = [(x0, bot), (x0 + a, bot)]
    Fb = [(x0, top - dy), (x0 + a, top - dy)]
    A, B, Bt, At = Pf[0], Pf[1], Fb[1], Fb[0]
    A2, B2 = (A[0] + dx, A[1] + dy), (B[0] + dx, B[1] + dy)
    At2, Bt2 = (At[0] + dx, At[1] + dy), (Bt[0] + dx, Bt[1] + dy)
    b += [ln(A, B), ln(B, Bt), ln(Bt, At), ln(At, A),           # передня грань
          ln(At, At2), ln(Bt, Bt2), ln(At2, Bt2), ln(B, B2), ln(B2, Bt2),
          ln(A, A2, 2, True), ln(A2, B2, 2, True), ln(A2, At2, 2, True)]
    return svg("q21-cylinder-prism.svg", 400, 320, "".join(b))


def fig(n, meta, alt):
    return [{"id": f"{P}-q{n:02d}-fig", "kind": "image", "alt": alt, **meta}]


F2 = fig(2, chart(), "Діаграма зміни вартості EcoFlow порівняно з травнем, грн: травень 0, червень −4000, липень −2000, серпень 5000, вересень 8000")
F6 = fig(6, pyramid(), "Чотирикутна піраміда SABCD, невидимі ребра SB, AB і BC позначено штрихом")
F14 = fig(14, trapezoid(), "Трапеція ABCD з діагоналлю AC; DH — перпендикуляр з вершини D до AC")
F18 = fig(18, rhombus_triangle(), "Ромб ABCD і рівнобедрений трикутник BEC зі спільною стороною BC; EB = EC")
F20 = fig(20, gels(), "На полиці в ряд стоять п’ять гелів для прання: Ariel, Persil, Perwoll, Savex, Coccolino")
F21 = fig(21, cylinder_prism(), "Циліндр і правильна чотирикутна призма однакової висоти")


# ---------- завдання ----------
def sc(n, statement, opts, correct, expl, assets=None):
    q = {"id": f"{P}-q{n:02d}", "type": "single_choice", "statement": statement,
         "options": [{"id": f"{P}-q{n:02d}-o{i+1}", "content": o} for i, o in enumerate(opts)],
         "answerKey": {"optionId": f"{P}-q{n:02d}-o{'АБВГД'.index(correct)+1}"}, "maxPoints": 1, "textExplanation": expl}
    if assets: q["assets"] = assets
    return q


def mt(n, statement, rows, opts, key, expl, assets=None):
    qid = f"{P}-q{n:02d}"
    q = {"id": qid, "type": "matching", "statement": statement,
         "matchingRows": [{"id": f"{qid}-r{i+1}", "content": r} for i, r in enumerate(rows)],
         "matchingOptions": [{"id": f"{qid}-m{i+1}", "content": o} for i, o in enumerate(opts)],
         "allowOptionReuse": False,
         "answerKey": {"pairs": {f"{qid}-r{i+1}": f"{qid}-m{'АБВГД'.index(k)+1}" for i, k in enumerate(key)}},
         "maxPoints": 3, "textExplanation": expl}
    if assets: q["assets"] = assets
    return q


def nm(n, statement, value, expl, assets=None):
    q = {"id": f"{P}-q{n:02d}", "type": "numeric", "statement": statement, "numericRule": {"mode": "exact"},
         "answerKey": {"value": value}, "maxPoints": 2, "textExplanation": expl}
    if assets: q["assets"] = assets
    return q


Q = [
 sc(1, r"Розв’яжіть нерівність: $-4x^{2}+24x-36\ge 0$.",
    [r"$(-\infty;\,3)\cup(3;\,+\infty)$", r"$(-3;\,3)$", r"$\{3\}$", r"$(-\infty;\,3)$", r"$(3;\,+\infty)$"], "В",
    "$-4x^{2}+24x-36=-4(x^{2}-6x+9)=-4(x-3)^{2}$.\n\n$-4(x-3)^{2}\\ge 0$ лише тоді, коли $(x-3)^{2}=0$, тобто $x=3$. Відповідь: $\\{3\\}$."),
 sc(2, "На діаграмі відображено інформацію щодо зміни вартості EcoFlow протягом чотирьох місяців з червня до вересня цього року в порівнянні з травнем. На скільки відсотків збільшилась вартість EcoFlow у вересні порівняно з травнем, якщо у травні вона становила 20000 грн?",
    ["18%", "25%", "35%", "40%", "48%"], "Г",
    "З діаграми: у вересні вартість більша, ніж у травні, на $8000$ грн.\n\n$\\dfrac{8000}{20000}\\cdot 100\\%=40\\%$.", F2),
 sc(3, "Автомобіль їде прямою трасою між містами $A$ і $B$ Полтавської області, довжина якої становить 115 км. На цій дорозі від міста $A$ до $B$ послідовно розташовані АЗС та автомайстерня. Відомо, що відстань між АЗС і автомайстернею становить 25 км, а відстань між містом $A$ та АЗС на 30 км більша, ніж відстань між АЗС і автомайстернею. Визначте, яку відстань у кілометрах має подолати автомобіліст від автомайстерні до міста $B$.",
    ["20 км", "25 км", "35 км", "40 км", "75 км"], "В",
    "Від $A$ до АЗС: $25+30=55$ км. Від $A$ до автомайстерні: $55+25=80$ км.\n\nВід автомайстерні до $B$: $115-80=35$ км."),
 sc(4, r"$-2\log_{\frac{1}{8}}5+\log_{0{,}125}200=$",
    ["$-3$", "$-1$", "$1$", "$2$", "$3$"], "Б",
    "$0{,}125=\\dfrac{1}{8}$, тому обидва логарифми мають ту саму основу.\n\n$-2\\log_{\\frac{1}{8}}5+\\log_{\\frac{1}{8}}200=\\log_{\\frac{1}{8}}\\dfrac{200}{25}=\\log_{\\frac{1}{8}}8=-1$."),
 sc(5, "У домашній духовці піца випікається за 14 хвилин. У професійній печі швидкість випікання в 3,5 раза більша. За скільки хвилин піца випечеться в професійній печі?",
    ["3", "4", "6", "12", "49"], "Б",
    "Швидкість більша в 3,5 раза, отже час менший у 3,5 раза: $14:3{,}5=4$ хв."),
 sc(6, r"На рисунку зображено чотирикутну піраміду $SABCD$. Скільки всього є прямих, що проходять через вершину $B$ та є мимобіжними з ребром $SC$?",
    ["жодної", "лише одна", "лише дві", "лише три", "безліч"], "Д",
    "Точка $B$ не лежить на прямій $SC$. Через $B$ проходить безліч прямих, які не лежать у площині $SBC$; кожна з них не перетинає $SC$ і не паралельна їй, тобто мимобіжна з $SC$. Таких прямих безліч.", F6),
 sc(7, r"Розв’яжіть рівняння: $\left(\dfrac{1}{49}\right)^{x}=343\cdot 7^{x}$.",
    ["$-3$", "$-2$", "$-1$", "$1$", "$4$"], "В",
    "$\\left(\\dfrac{1}{49}\\right)^{x}=7^{-2x}$, $343\\cdot 7^{x}=7^{3+x}$.\n\n$-2x=3+x$, $x=-1$."),
 sc(8, r"Знайдіть кут, який утворює графік функції $y=1-\dfrac{\sqrt{3}}{3}x$ з додатним напрямом осі $x$.",
    ["$30^{\\circ}$", "$45^{\\circ}$", "$60^{\\circ}$", "$120^{\\circ}$", "$150^{\\circ}$"], "Д",
    "Кутовий коефіцієнт $k=\\operatorname{tg}\\alpha=-\\dfrac{\\sqrt{3}}{3}$.\n\nНа проміжку $[0^{\\circ};\\,180^{\\circ})$ це $\\alpha=150^{\\circ}$."),
 sc(9, "Які з наведених тверджень є правильними?\n\nI. Існує трикутник, середня лінія якого більша за одну з його сторін.\nII. Існує прямокутний трикутник зі сторонами 6 см, 8 см, 10 см і радіусом вписаного кола 1 см.\nIII. Існує прямокутник, кут між діагоналями якого дорівнює $10^{\\circ}$.",
    ["лише I", "лише I та II", "лише II та III", "лише I та III", "I, II та III"], "Г",
    "I — правильно: наприклад, у трикутнику зі сторонами 1, 3 і 3,5 середня лінія, паралельна стороні 3,5, дорівнює 1,75 > 1.\n\nII — неправильно: $r=\\dfrac{6+8-10}{2}=2$ см, а не 1 см.\n\nIII — правильно: кут між діагоналями прямокутника може бути будь-яким від $0^{\\circ}$ до $90^{\\circ}$, зокрема $10^{\\circ}$."),
 sc(10, r"Обчисліть суму членів арифметичної прогресії $-60,\,-55,\,-50,\,\ldots,\,35$.",
    ["$-275$", "$-250$", "$-237{,}5$", "$-125$", "$-25$"], "Б",
    "$a_1=-60$, $d=5$, $a_n=35$: $n=\\dfrac{35-(-60)}{5}+1=20$.\n\n$S_{20}=\\dfrac{-60+35}{2}\\cdot 20=-250$."),
 sc(11, r"За якого найбільшого з наведених значень кута $\alpha$ справджується нерівність: $\sin(-405^{\circ})\cdot\cos\alpha<0$?",
    ["$30^{\\circ}$", "$90^{\\circ}$", "$150^{\\circ}$", "$175^{\\circ}$", "$330^{\\circ}$"], "Д",
    "$\\sin(-405^{\\circ})=-\\sin 45^{\\circ}<0$, тому потрібно $\\cos\\alpha>0$.\n\nСеред варіантів $\\cos\\alpha>0$ при $30^{\\circ}$ і $330^{\\circ}$. Найбільше: $330^{\\circ}$."),
 sc(12, r"У прямокутній системі координат у просторі задано конус, вершина якого знаходиться в початку координат, а точка $O(-6;\,-2;\,-9)$ є центром його основи. Визначте довжину висоти цього конуса.",
    ["9", "11", "12", "13", "15"], "Б",
    "Висота — відрізок від вершини $(0;\\,0;\\,0)$ до центра основи:\n$h=\\sqrt{36+4+81}=\\sqrt{121}=11$."),
 sc(13, r"$-5^{2}\cdot\left(-2x^{3}\right)^{4}:4x^{3}=$",
    ["$100x^{9}$", "$-100x^{9}$", "$-100x^{27}$", "$100x^{27}$", "$-100x^{4}$"], "Б",
    "$-5^{2}=-25$, $\\left(-2x^{3}\\right)^{4}=16x^{12}$.\n\n$-25\\cdot 16x^{12}:4x^{3}=-100x^{9}$."),
 sc(14, r"Навколо трапеції $ABCD$ можна описати коло. Більша основа цієї трапеції дорівнює 40 см, а бічна сторона $AB$ — 25 см. Відстань $DH$ від вершини $D$ до діагоналі $AC$ поділяє діагональ $AC$ таким чином, що $AH-HC=25$ см. Знайдіть довжину діагоналі $AC$.",
    ["17 см", "29 см", "32 см", "39 см", "41 см"], "Г",
    "Трапеція вписана в коло, отже рівнобічна: $CD=AB=25$ см.\n\nЗ прямокутних трикутників $AHD$ і $CHD$: $DH^{2}=AD^{2}-AH^{2}=CD^{2}-HC^{2}$.\n\n$AH^{2}-HC^{2}=1600-625=975$, тобто $(AH-HC)(AH+HC)=975$.\n\n$AC=AH+HC=975:25=39$ см.", F14),
 sc(15, "Розв’яжіть систему рівнянь:\n$$\\begin{cases} \\dfrac{y}{2x-3y}=\\dfrac{2}{7},\\\\ 5y-4x=96. \\end{cases}$$",
    [r"$(-39;\,-12)$", r"$(39;\,12)$", r"$(39;\,-12)$", r"$(-39;\,12)$", r"$(4;\,13)$"], "А",
    "З першого рівняння: $7y=4x-6y$, тобто $4x=13y$.\n\nПідставимо в друге: $5y-13y=96$, $y=-12$, $x=-39$.\n\nПеревірка: $2x-3y=-78+36=-42\\neq 0$. Відповідь: $(-39;\\,-12)$."),
 mt(16, r"Узгодьте вираз (1–3) з його значенням (А–Д), якщо $a=2$.",
    [r"$\dfrac{5a-4a^{2}}{4a-5}$", r"$\sqrt{(a-5)^{2}}$", r"$81^{\log_{3}a}$"],
    ["$-3$", "$-2$", "$2$", "$3$", "$16$"], "БГД",
    "1. $\\dfrac{10-16}{8-5}=\\dfrac{-6}{3}=-2$ — Б.\n\n2. $\\sqrt{(2-5)^{2}}=|-3|=3$ — Г.\n\n3. $81^{\\log_{3}2}=3^{4\\log_{3}2}=2^{4}=16$ — Д."),
 mt(17, "Увідповідніть початок речення (1–3) із його закінченням (А–Д) так, щоб утворилось правильне твердження.",
    [r"Графіки функцій $y=8-2x$ та $y=-2x$",
     r"Графіки функцій $y=x^{2}-2x$ та $y=\dfrac{9}{x}$",
     r"Графік функції $y=\sin x$ та пряма $y=\dfrac{1}{\sqrt{3}}$"],
    ["не мають жодної спільної точки", "мають єдину спільну точку", "мають дві спільні точки",
     "мають три спільні точки", "мають безліч спільних точок"], "АБД",
    "1. Прямі мають однаковий кутовий коефіцієнт $-2$ і різні вільні члени, тобто паралельні — А.\n\n2. $x^{2}-2x=\\dfrac{9}{x}\\Rightarrow x^{3}-2x^{2}-9=0$. Функція $g(x)=x^{3}-2x^{2}-9$ має екстремуми при $x=0$ і $x=\\dfrac{4}{3}$, обидва значення від’ємні, тому корінь один — Б.\n\n3. $0<\\dfrac{1}{\\sqrt{3}}<1$, рівняння $\\sin x=\\dfrac{1}{\\sqrt{3}}$ має безліч розв’язків — Д."),
 mt(18, r"Ромб $ABCD$ з гострим кутом $60^{\circ}$ та рівнобедрений трикутник $BEC$ з бічною стороною 8 см лежать в одній площині. Довжина ламаної $BADC$ дорівнює $24\sqrt{3}$ см. Установіть відповідність між відрізком (1–3) та його довжиною (А–Д).",
    ["$BD$", "Бісектриса кута $E$ в трикутнику $BEC$", "$ED$"],
    ["4 см", "6 см", "8 см", r"$8\sqrt{3}$ см", "16 см"], "ГАД",
    "Ламана $BADC$ складається з трьох сторін ромба: $3a=24\\sqrt{3}$, $a=8\\sqrt{3}$ см.\n\n1. $\\angle A=60^{\\circ}$, тому трикутник $ABD$ рівносторонній: $BD=8\\sqrt{3}$ см — Г.\n\n2. Бісектриса кута $E$ є висотою і медіаною: $\\sqrt{8^{2}-(4\\sqrt{3})^{2}}=\\sqrt{16}=4$ см — А.\n\n3. Бісектриса з $E$ перпендикулярна до $BC$ і проходить через середину $BC$. Вершина $D$ лежить на цій самій прямій: проєкція $CD$ на $BC$ дорівнює $8\\sqrt{3}\\cdot\\cos 60^{\\circ}=4\\sqrt{3}$, а відстань від $D$ до $BC$ — $8\\sqrt{3}\\cdot\\sin 60^{\\circ}=12$ см. Отже, $ED=4+12=16$ см — Д.", F18),
 nm(19, r"Для якого значення $x_0$ функція $y=x^{4}-2x^{3}+15$ набуває свого найбільшого значення на проміжку $[-2;\,1]$?", "-2",
    "$y'=4x^{3}-6x^{2}=2x^{2}(2x-3)$. Критичні точки: $x=0$ і $x=1{,}5$ (не належить проміжку).\n\n$y(-2)=16+16+15=47$, $y(0)=15$, $y(1)=14$.\n\nНайбільше значення $47$ при $x_0=-2$."),
 nm(20, "У магазині «EVA» на полиці в ряд планують виставити п’ять гелів для прання таких марок: Ariel, Persil, Perwoll, Savex, Coccolino (див. рисунок). Скількома різними способами можна розставити ці гелі на полиці, якщо Ariel та Persil мають стояти поруч, а Coccolino по центру?", "8",
    "Coccolino стоїть на 3-му місці. Ariel і Persil поруч можуть стояти на місцях 1–2 або 4–5: 2 способи, і в кожному 2 порядки.\n\nДва інші гелі займають решту два місця: $2!=2$ способи.\n\n$2\\cdot 2\\cdot 2=8$.", F20),
 nm(21, r"На рисунку зображено правильну чотирикутну призму та циліндр, які мають рівні висоти, а діаметр основи циліндра дорівнює стороні основи призми. Знайдіть об’єм призми, якщо площа основи циліндра дорівнює $16\pi$ см², а площа його повної поверхні — $80\pi$ см².", "384",
    "$\\pi r^{2}=16\\pi$, тому $r=4$ см, а сторона основи призми $a=2r=8$ см.\n\n$S_{повн}=2\\pi r^{2}+2\\pi rh$: $80\\pi=32\\pi+8\\pi h$, $h=6$ см.\n\n$V=a^{2}h=64\\cdot 6=384$ см³.", F21),
 nm(22, r"Визначте суму всіх цілих значень параметра $a$, що належать відрізку $[-5;\,7]$, за кожного з яких рівняння $\dfrac{\sqrt{|x-3|+a-1}}{x^{2}-4}=0$ має два різні корені.", "-11",
    "Рівняння рівносильне системі $|x-3|=1-a$, $x\\neq\\pm 2$.\n\nДва корені $x=3\\pm(1-a)$ можливі лише при $1-a>0$, тобто $a<1$.\n\nВиключаємо випадки, коли один із коренів дорівнює $\\pm 2$: $3-(1-a)=2\\Rightarrow a=0$; $3-(1-a)=-2\\Rightarrow a=-4$.\n\nЦілі $a\\in[-5;\\,7]$: $-5,\\,-3,\\,-2,\\,-1$. Сума: $-11$."),
]

SCORING = [{"id": "nmt-math-22", "questionCount": 22, "maxTotal": 32, "layout": [{"from": 1, "to": 15, "type": "single_choice", "maxPoints": 1, "optionCount": 5}, {"from": 16, "to": 18, "type": "matching", "maxPoints": 3, "rowCount": 3, "optionCount": 5}, {"from": 19, "to": 22, "type": "numeric", "maxPoints": 2}]}]
REFERENCE = [{"id": "nmt-reference", "title": "Довідкові матеріали", "kind": "images", "pages": [{"src": "reference/page-1.png", "alt": "Довідкові матеріали, сторінка 1: таблиця квадратів, алгебра і початки аналізу"}, {"src": "reference/page-2.png", "alt": "Довідкові матеріали, сторінка 2: похідна, первісна, тригонометрія"}, {"src": "reference/page-3.png", "alt": "Довідкові матеріали, сторінка 3: геометрія, координати та вектори"}], "downloadSrc": "reference/dovidkovi-materialy.pdf"}]
CONVERSION = json.load(open("public/content/sets/nmt-23/package.json"))["conversionTables"]

sim = {"id": SID, "title": "Симуляція НМТ №3", "subject": "Математика", "version": "1.0.0",
       "durationSeconds": 5400, "orderedQuestionIds": [q["id"] for q in Q], "referenceMaterialId": "nmt-reference",
       "scoringProfileId": "nmt-math-22", "conversionTableId": CONVERSION[0]["id"], "readiness": "complete", "isDemo": False,
       "source": {"kind": "imported", "note": "Завдання й ключі надав власник сайту. Рисунки намальовано у SVG."}}
pkg = {"schemaVersion": 1, "simulation": sim, "questions": Q,
       "scoringProfiles": SCORING, "referenceMaterials": REFERENCE, "conversionTables": CONVERSION}
json.dump(pkg, open(OUT + "package.json", "w"), ensure_ascii=False, indent=2)
print(len(Q), "питань")

# Каталог: додаємо або оновлюємо запис, інші набори не чіпаємо.
cat_path = "public/content/catalog.json"
cat = json.load(open(cat_path))
entry = {"id": SID, "title": sim["title"], "package": f"sets/{SID}/package.json", "videoMap": None}
cat["entries"] = [e for e in cat["entries"] if e["id"] != SID] + [entry]
json.dump(cat, open(cat_path, "w"), ensure_ascii=False, indent=2)
