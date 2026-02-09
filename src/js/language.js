const translations = {
    en: {
        "nav.brand": "Election Commission Of INDIA",
        "nav.admin": "Admin",
        "nav.voter": "Voter",
        "nav.logout": "Logout",
        "hero.title": "Decentralized Voting",
        "hero.subtitle": "Cast Your Vote",
        "stats.candidates": "Candidates",
        "stats.votes": "Votes Cast",
        "stats.status": "Status",
        "stats.leading": "Leading",
        "btn.vote": "Submit Vote",
        "modal.confirm": "Confirm Your Vote",
        "modal.success": "Vote Recorded Successfully!",
        "ticker.loading": "Welcome to the Decentralized Voting System | Loading updates...",
        "search.placeholder": "Search candidates or parties...",
        "admin.title": "Admin Portal",
        "admin.subtitle": "Management Dashboard",
        "card.addCandidate": "Add Candidate",
        "card.broadcast": "Broadcast Message",
        "card.notify": "Voter Notification",
        "login.welcome": "Welcome Back",
        "login.subtitle": "Secure Blockchain Voting System",
        "role.voter": "Voter",
        "role.admin": "Admin",
        "label.voterId": "Voter ID",
        "label.password": "Password",
        "label.email": "Email Address",
        "label.confirmPassword": "Confirm Password",
        "btn.register": "Register Now",
        "register.title": "Voter Registration",
        "link.register": "Register here",
        "link.login": "Login here",
        "verify.title": "Verify Your Vote",
        "verify.subtitle": "Enter your transaction hash to confirm your vote was recorded on the blockchain",
        "verify.placeholder": "Enter transaction hash (0x...)",
        "verify.btn": "Verify Vote",
        "verify.howItWorks": "How it works",
        "verify.step1": "Scan the QR code on your voting receipt OR enter the transaction hash manually",
        "verify.step2": "We check the blockchain for your vote record",
        "verify.step3": "Your vote choice remains private - only the timestamp is shown"
    },
    hi: {
        "nav.brand": "भारत निर्वाचन आयोग",
        "nav.admin": "प्रशासक",
        "nav.voter": "मतदाता",
        "nav.logout": "लॉग आउट",
        "hero.title": "विकेंद्रीकृत मतदान",
        "hero.subtitle": "अपना वोट डालें",
        "stats.candidates": "उम्मीदवार",
        "stats.votes": "कुल वोट",
        "stats.status": "स्थिति",
        "stats.leading": "सबसे आगे",
        "btn.vote": "वोट जमा करें",
        "modal.confirm": "अपने वोट की पुष्टि करें",
        "modal.success": "वोट सफलतापूर्वक दर्ज किया गया!",
        "ticker.loading": "विकेंद्रीकृत मतदान प्रणाली में आपका स्वागत है | अपडेट लोड हो रहे हैं...",
        "search.placeholder": "उम्मीदवारों या पार्टियों को खोजें...",
        "admin.title": "व्यवस्थापक पोर्टल",
        "admin.subtitle": "प्रबंधन डैशबोर्ड",
        "card.addCandidate": "उम्मीदवार जोड़ें",
        "card.broadcast": "संदेश प्रसारित करें",
        "card.notify": "मतदाता अधिसूचना",
        "login.welcome": "वापसी पर स्वागत है",
        "login.subtitle": "सुरक्षित ब्लॉकचेन मतदान प्रणाली",
        "role.voter": "मतदाता",
        "role.admin": "प्रशासक",
        "label.voterId": "मतदाता पहचान पत्र",
        "label.password": "पारण शब्द (पासवर्ड)",
        "label.email": "ईमेल पता",
        "label.confirmPassword": "पासवर्ड की पुष्टि करें",
        "btn.register": "अभी रजिस्टर करें",
        "register.title": "मतदाता पंजीकरण",
        "link.register": "यहाँ रजिस्टर करें",
        "link.login": "यहाँ लॉगिन करें",
        "verify.title": "अपने वोट की पुष्टि करें",
        "verify.subtitle": "यह पुष्टि करने के लिए कि आपका वोट ब्लॉकचेन पर दर्ज किया गया था, अपना ट्रांजेक्शन हैश दर्ज करें",
        "verify.placeholder": "ट्रांजेक्शन हैश दर्ज करें (0x...)",
        "verify.btn": "वोट सत्यापित करें",
        "verify.howItWorks": "यह कैसे काम करता है",
        "verify.step1": "अपनी वोटिंग रसीद पर QR कोड स्कैन करें या ट्रांजेक्शन हैश मैन्युअल रूप से दर्ज करें",
        "verify.step2": "हम आपके वोट रिकॉर्ड के लिए ब्लॉकचेन की जांच करते हैं",
        "verify.step3": "आपका वोट विकल्प निजी रहता है - केवल समय दिखाया जाता है"
    }
};

let currentLang = 'en';

window.toggleLanguage = function() {
    const newLang = currentLang === 'en' ? 'hi' : 'en';
    changeLanguage(newLang);
};

function changeLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    
    // Update all elements with data-i18n attribute
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            // Handle input placeholders specifically
            if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                el.placeholder = translations[lang][key];
            } else {
                el.textContent = translations[lang][key];
            }
        }
    });

    // Update Toggle Button Text
    const toggleBtn = document.getElementById('langToggle');
    if (toggleBtn) {
        // Show the OTHER language as the option
        toggleBtn.innerHTML = lang === 'en' ? '🇮🇳 हिन्दी' : '🇺🇸 English';
    }

    // Save preference
    localStorage.setItem('preferredLanguage', lang);
}

// Initialize on load
function initLanguage() {
    console.log("Initializing Language System...");
    const savedLang = localStorage.getItem('preferredLanguage') || 'en';
    changeLanguage(savedLang);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguage);
} else {
    initLanguage();
}
console.log("Language System Loaded - toggleLanguage() ready.");
