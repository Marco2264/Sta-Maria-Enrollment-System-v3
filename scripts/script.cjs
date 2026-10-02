const fs = require('fs');
let content = fs.readFileSync('src/pages/parent/ParentPortal.tsx', 'utf8');

content = content.replace(/className=\{`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \$\{collapsed \? 'justify-center p-2\.5' : 'px-3 py-2'\} text-sm \$\{\}/g, "className={`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm ${");

// Now we need to manually fix each button's styling and icon container
const fixButton = (viewCondition, iconName, labelText) => {
    const regex = new RegExp(
        `<button\\s+onClick=\\{.*?\\}\\s+className=\\{(\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \\$\\{collapsed \\? 'justify-center p-2\\.5' : 'px-3 py-2'\\} text-sm \\$\\{)[\\s\\S]*?<\\/button>`, 'g'
    );
    // Well regex matching whole button might be tricky. Let's just do a big replace block for the whole nav items section.
};

// Actually I can just replace the whole `<div className={\`flex-1 overflow-y-auto...` block
