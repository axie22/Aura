import { summarizeDiff } from '../llm/gemini.js';
import dotenv from 'dotenv';

dotenv.config();

async function testGemini() {
    console.log("Testing Gemini Diff Summarizer...");

    const mockDiff = `
diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index 1234567..89abcde 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -10,7 +10,7 @@ export const Button = ({ children, variant = 'primary' }: ButtonProps) => {
   return (
     <button
       className={\`px-4 py-2 rounded-md \${
-        variant === 'primary' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
+        variant === 'primary' ? 'bg-[#ff0000] text-white' : 'bg-gray-200 text-black'
       }\`}
     >
       {children}
    `;

    console.log("Sending mock diff to Gemini...");
    const summary = await summarizeDiff(mockDiff);

    console.log("\n--- GEMINI SUMMARY ---\n");
    console.log(summary);
}

testGemini();
