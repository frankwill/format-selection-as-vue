import * as vscode from 'vscode';
import * as prettier from 'prettier/standalone';
import * as parserHtml from 'prettier/plugins/html';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'format-template-string-as-vue.format',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; };

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);
			const line = editor.document.lineAt(selection.start.line);
			const baseIndent = line.text.match(/^\s*/)?.[0] ?? '';

      try {
				const sorted = sortAttributes(selectedText);

				const formatted = await prettier.format(sorted, {
					parser: 'html',
					plugins: [parserHtml],
					singleAttributePerLine: true,
				});

				const formattedIndented = indentToSelectionBase(formatted.trim(), baseIndent);

        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, formattedIndented);
        });
      } catch (err) {
        vscode.window.showErrorMessage('Erro ao formatar');
        console.error(err);
      }
    }
  );

  context.subscriptions.push(disposable);
}

function indentToSelectionBase(text: string, baseIndent: string) {
  return text
    .split('\n')
    .map((line) => (line.trim() ? baseIndent + line : line))
    .join('\n');
}

function sortAttributes(html: string) {
  return html.replace(/<([a-zA-Z-]+)\s+([^>]+)>/g, (match, tag, attrs) => {
    const parts = attrs.match(/([:@\w-]+)(="[^"]*"|'[^']*'|=[^\s]+)?/g);

    if (!parts) {return match;}

    const getPriority = (attr: string) => {
      if (attr.startsWith('v-model')) {return 1;}
      if (attr.startsWith(':')) {return 2;}
      if (attr.startsWith('@')) {return 4;}
      return 3;
    };

    const sorted = parts.sort((a: string, b: string) => {
      const pa = getPriority(a);
      const pb = getPriority(b);

      if (pa !== pb) {return pa - pb;}

      return a.localeCompare(b);
    });

    return `<${tag} ${sorted.join(' ')}>`;
  });
}

export function deactivate() {}