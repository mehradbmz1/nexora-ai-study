import type { SubjectTopic, VoicePersonaInfo, Conversation } from '../types';

export const STUDY_SUBJECTS: SubjectTopic[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    nameFa: 'ریاضیات',
    iconName: 'Sigma',
    accentColor: '#3b82f6',
    gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
    description: 'Calculus, Linear Algebra, Probability & Proofs',
    descriptionFa: 'حساب دیفرانسیل و انتگرال، جبر خطی، نظریه احتمال و ماتریس‌ها',
    sampleQuestions: [
      {
        id: 'math-1',
        title: "Bayes' Theorem & Intuition",
        prompt: "Can you explain Bayes' Theorem with visual intuition and a real-world medical diagnostic example?",
        badge: 'Probability',
        lang: 'en',
      },
      {
        id: 'math-2',
        title: 'Eigenvalues & Geometric Transformations',
        prompt: 'What is the geometric and physical intuition behind Eigenvalues and Eigenvectors in linear algebra?',
        badge: 'Linear Algebra',
        lang: 'en',
      },
      {
        id: 'math-3',
        title: 'Fundamental Theorem of Calculus',
        prompt: 'Explain the connection between derivatives and integrals in the Fundamental Theorem of Calculus.',
        badge: 'Calculus',
        lang: 'en',
      },
    ],
  },
  {
    id: 'physics',
    name: 'Physics',
    nameFa: 'فیزیک',
    iconName: 'Atom',
    accentColor: '#8b5cf6',
    gradient: 'from-purple-500/20 via-violet-500/10 to-transparent',
    description: 'Quantum Mechanics, Relativity & Classical Dynamics',
    descriptionFa: 'مکانیک کوانتومی، نسبیت خاص اینشتین، ترمودینامیک و قوانین نیوتن',
    sampleQuestions: [
      {
        id: 'phys-1',
        title: 'Quantum Superposition & Double-Slit',
        prompt: 'Explain quantum superposition and the wave-particle duality in the Young double-slit experiment.',
        badge: 'Quantum',
        lang: 'en',
      },
      {
        id: 'phys-2',
        title: 'Special Relativity & Time Dilation',
        prompt: 'Why does time run slower for a moving observer according to Einstein’s Special Theory of Relativity?',
        badge: 'Relativity',
        lang: 'en',
      },
      {
        id: 'phys-3',
        title: 'Entropy & Second Law of Thermodynamics',
        prompt: 'How does the Second Law of Thermodynamics define the arrow of time through statistical entropy?',
        badge: 'Thermodynamics',
        lang: 'en',
      },
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    nameFa: 'شیمی',
    iconName: 'FlaskConical',
    accentColor: '#06b6d4',
    gradient: 'from-cyan-500/20 via-teal-500/10 to-transparent',
    description: 'Organic Reactions, Molecular Orbitals & Thermodynamics',
    descriptionFa: 'واکنش‌های شیمی آلی، هیبریداسیون اوربیتال‌ها و تعادل‌های شیمیایی',
    sampleQuestions: [
      {
        id: 'chem-1',
        title: 'SN1 vs SN2 Reaction Mechanisms',
        prompt: 'Break down the key differences between SN1 and SN2 nucleophilic substitution reactions step-by-step.',
        badge: 'Organic',
        lang: 'en',
      },
      {
        id: 'chem-2',
        title: 'Orbital Hybridization & Geometry',
        prompt: 'How do sp, sp2, and sp3 orbital hybridizations determine molecular shapes and bond angles?',
        badge: 'Molecular',
        lang: 'en',
      },
      {
        id: 'chem-3',
        title: "Le Chatelier's Principle & Equilibrium",
        prompt: "Explain how changes in pressure, volume, and temperature shift chemical equilibria via Le Chatelier's principle.",
        badge: 'Equilibrium',
        lang: 'en',
      },
    ],
  },
  {
    id: 'biology',
    name: 'Biology',
    nameFa: 'زیست‌شناسی',
    iconName: 'Dna',
    accentColor: '#10b981',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    description: 'Genetics, Cellular Respiration & Molecular Biology',
    descriptionFa: 'ژنتیک مولکولی، تنفس سلولی و چرخه کربس، ویرایش ژن با کریسپر',
    sampleQuestions: [
      {
        id: 'bio-1',
        title: 'CRISPR-Cas9 Gene Editing Mechanism',
        prompt: 'How does the CRISPR-Cas9 bacterial immune system recognize and cut targeted DNA sequences?',
        badge: 'Genetics',
        lang: 'en',
      },
      {
        id: 'bio-2',
        title: 'Cellular Respiration & ATP Yield',
        prompt: 'Trace glucose oxidation through glycolysis, the Krebs cycle, and oxidative phosphorylation, calculating net ATP.',
        badge: 'Metabolism',
        lang: 'en',
      },
      {
        id: 'bio-3',
        title: 'Action Potential in Neurons',
        prompt: 'Explain the electrochemical mechanism of depolarization, repolarization, and ion channels during a nerve impulse.',
        badge: 'Neuroscience',
        lang: 'en',
      },
    ],
  },
];

export const VOICE_PERSONAS: VoicePersonaInfo[] = [
  {
    id: 'aura',
    name: 'Aura',
    tagline: 'Warm & Socratic',
    description: 'Guides you with thought-provoking questions, encouraging deep conceptual understanding.',
    color: '#8b5cf6',
  },
  {
    id: 'orion',
    name: 'Orion',
    tagline: 'Deep & Analytical',
    description: 'Focuses on rigorous mathematical derivations, physics equations, and formal proofs.',
    color: '#3b82f6',
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Lively & Fast-Paced',
    description: 'High-energy, quick exam summaries, mnemonics, and real-world analogies.',
    color: '#ec4899',
  },
  {
    id: 'sol',
    name: 'Sol',
    tagline: 'Calm & Step-by-Step',
    description: 'Patient, stress-free pacing that breaks down complex homework problems simply.',
    color: '#10b981',
  },
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    title: 'برهم‌نهی کوانتومی و آزمایش دوشکاف',
    subject: 'physics',
    updatedAt: '۱۰ دقیقه پیش',
    category: 'Today',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'مفهوم برهم‌نهی کوانتومی و آزمایش دوشکاف یانگ را به زبان ساده توضیح بده.',
        timestamp: '19:15',
      },
      {
        id: 'm2',
        role: 'assistant',
        content: `**برهم‌نهی کوانتومی (Quantum Superposition)** یکی از شگفت‌انگیزترین اصول فیزیک بنیادی است:
یک ذره کوانتومی (مانند الکترون یا فوتون) تا زمانی که مورد اندازه‌گیری قرار نگرفته، می‌تواند به طور همزمان در ترکیبی از چند حالت فیزیکی ممکن وجود داشته باشد.

### ۱. آزمایش دو شکاف (Double-Slit Experiment)
وقتی الکترون‌ها را یکی‌یکی به سمت صفحه‌ای با دو شکاف پرتاب می‌کنیم:
- در فیزیک کلاسیک انتظار داریم دو نوار روی پرده مقابل تشکیل شود.
- اما در واقعیت، یک **الگوی تداخل نوارهای روشن و تاریک** ظاهر می‌شود!
- هر تک الکترون، مانند یک موج احتمال عمل کرده و حتی *با خودش* تداخل می‌کند، گویی همزمان از هر دو شکاف عبور کرده است.

### ۲. تابع موج شرودینگر (\\(\\Psi\\))
حالت کوانتومی ذره توسط تابع موج فرمول‌بندی می‌شود:`,
        mathFormula: '\\Psi(x, t) = c_1 \\psi_1(x, t) + c_2 \\psi_2(x, t)',
        studyTip: 'قانون بورن: احتمال حضور ذره در یک نقطه برابر است با مربع اندازه تابع موج یعنی |Ψ(x)|^2 نه خود تابع موج.',
        followUps: [
          'اگر یک آشکارساز در کنار یکی از شکاف‌ها بگذاریم چه اتفاقی برای الگوی تداخل می‌افتد؟',
          'چرا اجسام بزرگ روزمره ما پدیده برهم‌نهی کوانتومی را نشان نمی‌دهند؟',
          'تفاوت تفسیر کپنهاگی با تفسیر جهان‌های موازی در چیست؟',
        ],
        citations: [
          { title: 'کتاب فیزیک دانشگاهی یانگ و فریدمن — مکانیک کوانتومی', url: 'https://ocw.mit.edu', source: 'MIT OCW' },
          { title: 'پایگاه رشد — تداخل امواج و دو شکاف یانگ', url: 'https://roshd.ir', source: 'شبکه رشد' },
        ],
        timestamp: '19:16',
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'قضیه بیز و احتمال شرطی در کنکور و دانشگاه',
    subject: 'mathematics',
    updatedAt: '۳ ساعت پیش',
    category: 'Today',
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: 'قضیه بیز در آمار و احتمالات را با شهود تصویری و یک مثال پزشکی توضیح بده.',
        timestamp: '16:04',
      },
      {
        id: 'm4',
        role: 'assistant',
        content: `**قضیه بیز (Bayes' Theorem)** ابزاری ریاضی برای به‌روزرسانی احتمال باورهای ما بر اساس شواهد و داده‌های جدید است.

### فرمول ریاضی قضیه بیز:
\\[ P(A | B) = \\frac{P(B | A) \\cdot P(A)}{P(B)} \\]

### اجزای فرمول:
- **P(A)**: احتمال پیشین (Prior) قبل از مشاهده شواهد.
- **P(B | A)**: درست‌نمایی (Likelihood) شواهد به شرط درستی فرضیه A.
- **P(B)**: احتمال کل رخداد شواهد B (قانون احتمال کل).
- **P(A | B)**: احتمال پسین (Posterior) بعد از دریافت اطلاعات جدید.

### پارادوکس آزمایش پزشکی:
فرض کنید یک بیماری نادر در ۱ نفر از هر ۱۰۰۰ نفر وجود دارد (نرخ پایه ۰.۱٪). یک آزمایش پزشکی با **دقت ۹۹٪** طراحی شده است.
اگر نتیجه تست شما مثبت شود، احتمال واقعی بیمار بودن شما چقدر است؟ اغلب افراد حدس می‌زنند ۹۹٪؛ اما پاسخ ریاضی حدود **۹٪** است! زیرا در میان ۹۹۹ فرد سالم، حدود ۱۰ مثبت کاذب وجود دارد که از تک بیمار واقعی بیشتر است!`,
        mathFormula: 'P(A | B) = \\frac{P(B | A) \\cdot P(A)}{P(B)}',
        studyTip: 'نکته تستی: برای حل سریع مسائل احتمال شرطی در امتحانات، به جای فرمول‌های طولانی همیشه یک درخت فراوانی با ۱۰۰۰ نفر فرضی رسم کنید.',
        followUps: [
          'جدول ابهام (Confusion Matrix) را برای این آزمایش رسم کن',
          'کاربرد قضیه بیز در فیلترهای هرزنامه و یادگیری ماشین چگونه است؟',
        ],
        citations: [
          { title: 'پایگاه کتب درسی — ریاضیات گسسته و آمار دوازدهم', url: 'http://chap.sch.ir', source: 'آموزش و پرورش' },
          { title: 'Wolfram MathWorld — Bayes Theorem', url: 'https://mathworld.wolfram.com/BayesTheorem.html', source: 'Wolfram' },
        ],
        timestamp: '16:05',
      },
    ],
  },
];

export const KNOWLEDGE_BASE: Record<string, { answer: string; studyTip: string; formula?: string; followUps: string[]; citations?: { title: string; url: string; source: string }[] }> = {
  default: {
    answer: `پاسخ علمی و مفهومی نکسورا:
برای حل اصولی این مبحث طبق سرفصل استاندارد آموزشی، ابتدا باید تعاریف مرجع و روابط پایه را بررسی کرده و سپس با تحلیل منطقی، مسئله را حل نماییم.

۱. اصل علمی حاکم: شناسایی قانون یا فرمول بنیادین مسئله.
۲. روند استخراج و حل: جایگذاری داده‌ها با رعایت یکاهای استاندارد SI.
۳. نتیجه‌گیری و بررسی خطاهای رایج تستی.`,
    studyTip: 'روش فاینمن: سعی کنید این مفهوم را در ۶۰ ثانیه به زبان ساده برای فردی دیگر توضیح دهید تا تسلط خود را بسنجید.',
    followUps: [
      'یک تست چهارگزینه‌ای از این مبحث برای من مطرح کن',
      'این مفهوم چه ارتباطی با فصل‌های بعدی کتاب درسی دارد؟',
      'خلاصه این موضوع را در ۳ نکته کلیدی بگو',
    ],
    citations: [
      { title: 'کتاب‌های درسی رسمی آموزش و پرورش', url: 'http://chap.sch.ir', source: 'پایگاه کتاب‌های درسی' },
      { title: 'Khan Academy Open Library', url: 'https://www.khanacademy.org', source: 'Khan Academy' },
    ],
  },
  eigenvalues: {
    answer: `از دید هندسی، ضرب یک ماتریس مربعی \\(A\\) در یک بردار \\(x\\) معمولاً هم طول بردار را تغییر می‌دهد و هم جهت آن را می‌چرخاند.

اما در راستاهای ویژه‌ای، ماتریس **فقط بردار را کشیده یا منقبض می‌کند** بدون اینکه جهتش را تغییر دهد!
- این بردارهای ویژه، **بردار ویژه (Eigenvector)** هستند.
- ضریبی که بردار در آن ضرب می‌شود، **مقدار ویژه (\\(\\lambda\\))** نام دارد:`,
    formula: 'A x = \\lambda x \\iff (A - \\lambda I) x = 0',
    studyTip: 'شرط وجود پاسخ غیربدیهی: دترمینان ماتریس ضرایب باید صفر باشد یعنی det(A - λI) = 0 که معادله مشخصه ماتریس را می‌دهد.',
    followUps: [
      'قطری‌سازی ماتریس با مقادیر ویژه چگونه انجام می‌شود؟',
      'تعبیر فیزیکی مقادیر ویژه در معادله شرودینگر مکانیک کوانتوم چیست؟',
    ],
    citations: [
      { title: 'MIT Linear Algebra — Prof. Gilbert Strang', url: 'https://ocw.mit.edu', source: 'MIT OCW' },
      { title: 'Wolfram Alpha Matrix Calculator', url: 'https://www.wolframalpha.com', source: 'Wolfram' },
    ],
  },
  derivative: {
    answer: `تابع نمایی طبیعی \\(f(x) = e^x\\) تنها تابعی است که نرخ تغییرات (مشتق) آن در هر لحظه، دقیقاً برابر با مقدار خود تابع در همان لحظه است!

با استفاده از تعریف حدی مشتق:
\\[ f'(x) = \\lim_{h \\to 0} \\frac{e^{x+h} - e^x}{h} = e^x \\cdot \\lim_{h \\to 0} \\frac{e^h - 1}{h} \\]
با توجه به تعریف عدد نپر \\(e\\)، این حد دقیقاً برابر با ۱ است، بنابراین:
\\[ \\frac{d}{dx} e^x = e^x \\]`,
    formula: '\\frac{d}{dx} [e^x] = e^x',
    studyTip: 'به همین دلیل e^x کلید حل معادلات دیفرانسیل رشد جمعیت، واپاشی رادیواکتیو، و تخلیه خازن‌ها در فیزیک است.',
    followUps: [
      'مشتق a^x برای هر پایه دلخواه چگونه محاسبه می‌شود؟',
      'بسط تیلور تابع e^x را نشان بده',
    ],
    citations: [
      { title: 'حساب دیفرانسیل و انتگرال توماس', url: 'https://ocw.mit.edu', source: 'MIT' },
    ],
  },
  dilation: {
    answer: `در نسبیت خاص اینشتین، زمان امری مطلق نیست بلکه به چارچوب مرجع ناظر بستگی دارد.

چون سرعت نور \\(c\\) در تمام چارچوب‌های لخت مقداری ثابت و تغییرناپذیر است، مسیر طی شده توسط نور در ساعت ناظر متحرک طولانی‌تر خواهد بود؛ در نتیجه زمان برای ساعت متحرک کندتر سپری می‌شود (اتساع زمان):`,
    formula: '\\Delta t\' = \\frac{\\Delta t_0}{\\sqrt{1 - \\frac{v^2}{c^2}}} = \\gamma \\Delta t_0',
    studyTip: 'ضریب لورنتس (γ): با نزدیک شدن سرعت به سرعت نور، گاما به بی‌نهایت میل می‌کند، یعنی زمان برای ناظر بیرونی متوقف به نظر می‌رسد.',
    followUps: [
      'ماهواره‌های GPS چگونه اتساع زمان نسبیت خاص و عام را تصحیح می‌کنند؟',
      'پارادوکس دوقلوها چیست و چگونه با شتاب برطرف می‌شود؟',
    ],
    citations: [
      { title: 'Einstein Relativity Lectures', url: 'https://ocw.mit.edu', source: 'MIT OCW' },
    ],
  },
  crispr: {
    answer: `سیستم **کریسپر Cas9** از مکانیسم دفاعی باکتری‌ها در برابر ویروس‌ها الهام گرفته شده است:

### ۳ جزء اصلی سیستم کریسپر:
۱. **آنزیم نوکلئاز Cas9**: قیچی مولکولی که هر دو رشته DNA را برش می‌دهد.
۲. **آران‌ای راهنما (gRNA)**: توالی ۲۰ نوکلئوتیدی که نقطه دقیق ژن هدف را ردیابی می‌کند.
۳. **توالی PAM**: توالی کوتاه ۲ تا ۶ جفت‌بازی که Cas9 قبل از برش باید آن را تشخیص دهد.

پس از برش توسط Cas9، سلول از طریق مکانیسم‌های ترمیم DNA ژن معیوب را غیرفعال کرده یا ژن جدید را جایگزین می‌نماید.`,
    studyTip: 'کریسپر مخفف Clustered Regularly Interspaced Short Palindromic Repeats است.',
    followUps: [
      'تفاوت پرایم ادیتینگ (Prime Editing) با برش سنتی Cas9 چیست؟',
      'چگونه از خطاهای برش ناخواسته (Off-target) در ژن‌درمانی جلوگیری می‌شود؟',
    ],
    citations: [
      { title: 'PubMed Central — CRISPR Gene Editing Mechanisms', url: 'https://pubmed.ncbi.nlm.nih.gov', source: 'PubMed' },
      { title: 'پایگاه رشد — زیست‌شناسی مولکولی و مهندسی ژنتیک', url: 'https://roshd.ir', source: 'رشد' },
    ],
  },
};
