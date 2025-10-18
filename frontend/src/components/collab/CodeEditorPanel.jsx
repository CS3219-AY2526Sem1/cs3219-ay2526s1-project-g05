import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play } from "lucide-react";
import { EditorView, keymap, highlightActiveLine, lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";

const languageExtensions = {
  javascript: javascript(),
  python: python()
};

const defaultCode = {
  javascript: `function twoSum(nums, target) {
  // Write your solution here
  
}`,
  python: `def two_sum(nums, target):
    # Write your solution here
    pass`
};

export default function CodeEditorPanel() {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [language, setLanguage] = useState("javascript");

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: defaultCode[language],
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
          ...closeBracketsKeymap
        ]),
        languageExtensions[language],
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px"
          },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily: "'Fira Code', 'Monaco', 'Courier New', monospace"
          }
        })
      ]
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current
    });

    return () => {
      viewRef.current?.destroy();
    };
  }, [language]);

  const handleRun = () => {
    const code = viewRef.current?.state.doc.toString() || "";
    console.log("Running code:", code);
    // TODO: Implement code execution
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
  };

  return (
    <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Code Editor</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleRun} size="sm">
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div ref={editorRef} className="h-full w-full" />
      </CardContent>
    </Card>
  );
}
