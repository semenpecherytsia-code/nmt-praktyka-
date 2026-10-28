import json
L=['А','Б','В','Г','Д']
def sc(n, statement, opts, correct, expl, assets=None):
    q={"id":f"demo-q{n:02d}","type":"single_choice","statement":statement,
       "options":[{"id":f"demo-q{n:02d}-o{i+1}","content":o} for i,o in enumerate(opts)],
       "answerKey":{"optionId":f"demo-q{n:02d}-o{correct}"},"maxPoints":1,"textExplanation":expl}
    if assets: q["assets"]=assets
    return q
def mt(n, statement, rows, opts, pairs, reuse, expl):
    qid=f"demo-q{n:02d}"
    return {"id":qid,"type":"matching","statement":statement,
      "matchingRows":[{"id":f"{qid}-r{i+1}","content":r} for i,r in enumerate(rows)],
      "matchingOptions":[{"id":f"{qid}-m{i+1}","content":o} for i,o in enumerate(opts)],
      "allowOptionReuse":reuse,
      "answerKey":{"pairs":{f"{qid}-r{r}":f"{qid}-m{o}" for r,o in pairs}},
      "maxPoints":3,"textExplanation":expl}
def nm(n, statement, value, rule, expl):
    return {"id":f"demo-q{n:02d}","type":"numeric","statement":statement,"numericRule":rule,
            "answerKey":{"value":value},"maxPoints":2,"textExplanation":expl}

Q=[
 sc(1,r"Обчисліть $\dfrac{3}{4}+\dfrac{1}{6}$.",[r"$\dfrac{4}{10}$",r"$\dfrac{11}{12}$",r"$\dfrac{2}{3}$",r"$\dfrac{1}{6}$",r"$1$"],2,
    "Зведемо дроби до спільного знаменника 12:\n$\\dfrac{3}{4}=\\dfrac{9}{12}$, $\\dfrac{1}{6}=\\dfrac{2}{12}$.\n\nТоді $\\dfrac{9}{12}+\\dfrac{2}{12}=\\dfrac{11}{12}$."),
 sc(2,r"Розв’яжіть рівняння $2x-7=5$.",["$1$","$-1$","$6$","$12$","$3{,}5$"],3,
    "Перенесемо $-7$ у праву частину: $2x=5+7=12$.\n\nПоділимо на 2: $x=6$."),
 sc(3,r"Спростіть вираз $\dfrac{a^{5}\cdot a^{-2}}{a^{2}}$, де $a\neq 0$.",["$a$","$a^{5}$","$a^{-1}$","$a^{9}$","$a^{3}$"],1,
    "За властивостями степенів: $a^{5}\\cdot a^{-2}=a^{5+(-2)}=a^{3}$.\n\nДалі $\\dfrac{a^{3}}{a^{2}}=a^{3-2}=a$."),
 sc(4,r"Обчисліть $\log_{2}32$.",["$4$","$5$","$6$","$8$","$16$"],2,
    "Потрібно знайти показник, у який треба піднести 2, щоб отримати 32.\n\n$2^{5}=32$, отже $\\log_{2}32=5$."),
 sc(5,"На рисунку зображено прямокутний трикутник із катетами 6 і 8. Знайдіть довжину гіпотенузи $x$.",
    [r"$2\sqrt{7}$","$10$","$12$","$14$","$48$"],2,
    "За теоремою Піфагора: $x^{2}=6^{2}+8^{2}=36+64=100$.\n\nОтже, $x=\\sqrt{100}=10$.",
    assets=[{"id":"demo-q05-fig","kind":"image","src":"assets/right-triangle.svg","alt":"Прямокутний трикутник: катети 6 і 8, гіпотенуза позначена x","width":420,"height":300}]),
 sc(6,"Знайдіть площу круга радіуса 3.",[r"$3\pi$",r"$6\pi$",r"$9\pi$",r"$18\pi$",r"$36\pi$"],3,
    "Площа круга $S=\\pi r^{2}$.\n\n$S=\\pi\\cdot 3^{2}=9\\pi$."),
 sc(7,r"В арифметичній прогресії $a_{1}=2$, $d=3$. Знайдіть $a_{10}$.",["$27$","$29$","$30$","$32$","$35$"],2,
    "Формула $n$-го члена: $a_{n}=a_{1}+(n-1)d$.\n\n$a_{10}=2+9\\cdot 3=29$."),
 sc(8,r"Обчисліть $\sqrt{(-3)^{2}}+\left|-5\right|-2^{3}$.",["$-16$","$-6$","$0$","$6$","$16$"],3,
    "$\\sqrt{(-3)^{2}}=\\sqrt{9}=3$, $\\left|-5\\right|=5$, $2^{3}=8$.\n\n$3+5-8=0$."),
 sc(9,r"Розв’яжіть нерівність $x^{2}-5x+6<0$.",[r"$(-\infty;\,2)\cup(3;\,+\infty)$",r"$(2;\,3)$",r"$[2;\,3]$",r"$(-3;\,-2)$",r"$(-\infty;\,3)$"],2,
    "Корені рівняння $x^{2}-5x+6=0$: $x_{1}=2$, $x_{2}=3$.\n\nВітки параболи напрямлені вгору, тому вираз від’ємний між коренями. Нерівність строга, отже кінці не входять: $(2;\\,3)$."),
 sc(10,"Гральний кубик кидають один раз. Яка ймовірність того, що випаде парне число очок?",[r"$\dfrac{1}{6}$",r"$\dfrac{1}{3}$",r"$\dfrac{1}{2}$",r"$\dfrac{2}{3}$",r"$\dfrac{5}{6}$"],3,
    "Усього рівноможливих наслідків 6. Сприятливі: 2, 4, 6 — їх 3.\n\n$P=\\dfrac{3}{6}=\\dfrac{1}{2}$."),
 sc(11,r"Обчисліть $\sin 30^{\circ}$.",["$0$",r"$\dfrac{1}{2}$",r"$\dfrac{\sqrt{2}}{2}$",r"$\dfrac{\sqrt{3}}{2}$","$1$"],2,
    "У прямокутному трикутнику з кутом $30^{\\circ}$ протилежний катет дорівнює половині гіпотенузи.\n\nТому $\\sin 30^{\\circ}=\\dfrac{1}{2}$."),
 sc(12,r"Знайдіть $f'(2)$, якщо $f(x)=x^{3}-4x$.",["$0$","$4$","$8$","$12$","$16$"],3,
    "$f'(x)=3x^{2}-4$.\n\n$f'(2)=3\\cdot 4-4=8$."),
 sc(13,"Знайдіть об’єм куба з ребром 3 см.",[r"$9\ \text{см}^{3}$",r"$18\ \text{см}^{3}$",r"$27\ \text{см}^{3}$",r"$54\ \text{см}^{3}$",r"$81\ \text{см}^{3}$"],3,
    "Об’єм куба $V=a^{3}$.\n\n$V=3^{3}=27\\ \\text{см}^{3}$."),
 sc(14,"Обчисліть значення виразу\n$$\\frac{\\left(2^{10}-2^{9}\\right)\\cdot 3^{4}}{2^{8}\\cdot 3^{3}+2^{8}\\cdot 3^{3}}$$",
    ["$1$",r"$\dfrac{3}{2}$","$2$","$3$","$6$"],4,
    "Чисельник: $2^{10}-2^{9}=2^{9}(2-1)=2^{9}$, тому чисельник дорівнює $2^{9}\\cdot 3^{4}$.\n\nЗнаменник: $2^{8}\\cdot 3^{3}+2^{8}\\cdot 3^{3}=2\\cdot 2^{8}\\cdot 3^{3}=2^{9}\\cdot 3^{3}$.\n\n$$\\frac{2^{9}\\cdot 3^{4}}{2^{9}\\cdot 3^{3}}=3$$"),
 sc(15,"Товар коштував 800 грн, а потім подешевшав на 15 %. Скільки гривень коштує товар після знижки?",["$120$","$660$","$680$","$685$","$785$"],3,
    "15 % від 800 грн: $800\\cdot 0{,}15=120$ грн.\n\nНова ціна: $800-120=680$ грн."),
 mt(16,"Установіть відповідність між виразом (1–3) та його значенням (А–Д).",
    [r"$\sqrt{49}$",r"$2^{-1}$",r"$\log_{3}1$"],["$0$","$0{,}5$","$2$","$7$","$49$"],[(1,4),(2,2),(3,1)],False,
    "1. $\\sqrt{49}=7$ — варіант Г.\n\n2. $2^{-1}=\\dfrac{1}{2}=0{,}5$ — варіант Б.\n\n3. $\\log_{3}1=0$, бо $3^{0}=1$ — варіант А."),
 mt(17,"Установіть відповідність між рівнянням (1–3) та його коренем (А–Д).",
    ["$3x=12$","$x-4=-6$",r"$\dfrac{x}{2}=3$"],["$-2$","$2$","$4$","$6$","$8$"],[(1,3),(2,1),(3,4)],False,
    "1. $x=12:3=4$ — варіант В.\n\n2. $x=-6+4=-2$ — варіант А.\n\n3. $x=3\\cdot 2=6$ — варіант Г."),
 mt(18,"Установіть відповідність між фігурою (1–3) та кількістю її осей симетрії (А–Д). **Один варіант може відповідати кільком рядкам.**",
    ["квадрат","прямокутник, що не є квадратом","ромб, що не є квадратом"],["$0$","$1$","$2$","$4$","безліч"],[(1,4),(2,3),(3,3)],True,
    "1. Квадрат має 4 осі симетрії: дві діагоналі та дві прямі через середини протилежних сторін — варіант Г.\n\n2. Прямокутник, що не є квадратом, має 2 осі — прямі через середини протилежних сторін — варіант В.\n\n3. Ромб, що не є квадратом, має 2 осі — дві діагоналі — варіант В."),
 nm(19,r"Розв’яжіть рівняння $5x+3=-12$.","-3",{"mode":"exact"},
    "$5x=-12-3=-15$.\n\n$x=-15:5=-3$."),
 nm(20,r"Обчисліть $0{,}25\cdot 6$.","1.5",{"mode":"exact"},
    "$0{,}25\\cdot 6=\\dfrac{1}{4}\\cdot 6=\\dfrac{6}{4}=1{,}5$."),
 nm(21,"Обчисліть довжину кола радіуса 1. Відповідь запишіть десятковим дробом. *Зараховується відповідь із похибкою не більше 0,01.*","6.28",{"mode":"tolerance","tolerance":"0.01"},
    "Довжина кола $C=2\\pi r=2\\pi\\approx 6{,}2832$.\n\nЗа умовою допускається похибка 0,01, тому, наприклад, $6{,}28$ або $6{,}283$ зараховуються."),
 nm(22,"У коробці 3 червоні та 5 синіх кульок. Навмання беруть одну кульку. Знайдіть імовірність того, що вона червона. *Відповідь можна записати звичайним дробом через «/» (наприклад, 1/4) або десятковим дробом.*","3/8",{"mode":"exact","allowFractions":True},
    "Усього кульок $3+5=8$, червоних — 3.\n\n$P=\\dfrac{3}{8}=0{,}375$."),
]
sim={"id":"demo-tech","title":"Демонстраційний набір (технічна перевірка)","subject":"Математика","version":"demo-1.0.0",
 "durationSeconds":5400,"orderedQuestionIds":[q["id"] for q in Q],"referenceMaterialId":"demo-reference",
 "scoringProfileId":"nmt-math-22","conversionTableId":None,"readiness":"demo","isDemo":True,
 "source":{"kind":"demo","note":"Власні прості задачі для перевірки всіх типів завдань. Це не симуляція НМТ №23 і не копія її змісту."}}
pkg={"schemaVersion":1,"simulation":sim,"questions":Q,
 "scoringProfiles":[{"id":"nmt-math-22","questionCount":22,"maxTotal":32,"layout":[
   {"from":1,"to":15,"type":"single_choice","maxPoints":1,"optionCount":5},
   {"from":16,"to":18,"type":"matching","maxPoints":3,"rowCount":3,"optionCount":5},
   {"from":19,"to":22,"type":"numeric","maxPoints":2}]}],
 "referenceMaterials":[{"id":"demo-reference","title":"Демонстраційний довідник","kind":"pdf","src":"reference/demo-reference.pdf","downloadable":True}],
 "conversionTables":[]}
out="public/content/sets/demo-tech/"
json.dump(pkg,open(out+"package.json","w"),ensure_ascii=False,indent=2)
vm={"schemaVersion":1,"simulationId":"demo-tech","bindings":[
  {"questionId":"demo-q01","explanationVideoId":"demo-clip-a","verifiedBy":"технічний тест, не пояснення"},
  {"questionId":"demo-q02","explanationVideoId":"demo-clip-b","verifiedBy":"технічний тест, не пояснення"}],
 "media":[
  {"id":"demo-clip-a","kind":"video","title":"Технічний тестовий кліп A (не пояснення задачі)","publicUrl":"media/clip-a.mp4","poster":"media/clip-a.jpg","mimeType":"video/mp4","captions":[{"src":"media/clip-a.uk.vtt","srclang":"uk","label":"Українська"}],"readiness":"ready","technicalTestClip":True},
  {"id":"demo-clip-b","kind":"video","title":"Технічний тестовий кліп B (не пояснення задачі)","publicUrl":"media/clip-b.mp4","poster":"media/clip-b.jpg","mimeType":"video/mp4","readiness":"ready","technicalTestClip":True}]}
json.dump(vm,open(out+"video-map.json","w"),ensure_ascii=False,indent=2)
cat={"schemaVersion":1,"defaultSimulationId":"nmt-23","demoSimulationId":"demo-tech","entries":[
  {"id":"nmt-23","title":"Симуляція НМТ №23","package":None,"videoMap":None},
  {"id":"demo-tech","title":"Демонстраційний набір (технічна перевірка)","package":"sets/demo-tech/package.json","videoMap":"sets/demo-tech/video-map.json"}]}
json.dump(cat,open("public/content/catalog.json","w"),ensure_ascii=False,indent=2)
print(len(Q))
