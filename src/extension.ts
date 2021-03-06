'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
    window, workspace, commands, ExtensionContext, StatusBarAlignment, StatusBarItem, TextEditor, TextEditorEdit
} from 'vscode';

import * as googleTranslate from 'google-translate-api';
import * as googleTranslateCN from 'google-translate-api-cn';

import { camelize, decamelize } from 'humps';

const decamelizeQuery: (query: string) => string =
    (query) => decamelize(camelize(query), { split: /(?=[A-Z0-9])/, separator: ' ' })

export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated

    let isActive: Boolean,
        statusBarItem: StatusBarItem,
        timer: NodeJS.Timer,

        translate: (query: string, targetLanguage?: string, ...any: any[]) => any,
        updateTranslator: () => any = () => {
            if (!isActive) return;
            let { translation: { api, targetLanguage, detection, fromLanguage } } = workspace.getConfiguration();
            switch (api) {
                case "google-cn": case "google": default:
                    let gTranslate = api === "google" ? googleTranslate : googleTranslateCN;
                    translate = (query, _targetLanguage = targetLanguage, unrecursive?: Boolean) =>
                        gTranslate(query, { to: _targetLanguage })
                            .then(({
                                text,
                                from: {
                                    text: { autoCorrected, value, didYouMean },
                                    language: { iso, }
                                },
                            }) => {
                                /*
                                unrecursive -> update;
                                reverse -> translate(reverse);
                                len(value) > 5 && query === text 
                                ? 
                                translate(decamelize) :
                                update 
                                */
                                if (unrecursive) {
                                    statusBarItem.text = text;
                                    statusBarItem.show();
                                    return;
                                }
                                if (detection && iso === _targetLanguage && iso !== fromLanguage) {
                                    translate(query, fromLanguage, true);
                                    return;
                                }
                                if (query.length > 5) {
                                    if (autoCorrected || didYouMean) {
                                        window.showWarningMessage(`DidYouMean: ${value}`);
                                    }
                                    if (query === text) {
                                        let queryAfterDecamelize: string = decamelizeQuery(query);
                                        if (query !== queryAfterDecamelize){
                                            translate(queryAfterDecamelize, _targetLanguage, true);
                                            return;
                                        }
                                    }
                                }
                                statusBarItem.text = text;
                                statusBarItem.show();

                            }).catch(err => console.error(err));
                    break;
            }
        };

    context.subscriptions.push(
        // config change -> update properties
        workspace.onDidChangeConfiguration(updateTranslator),
        // selection change -> translate
        window.onDidChangeTextEditorSelection(({ textEditor, selections: [selection,] }) => {

            if (isActive && !selection.start.isEqual(selection.end)) {
                clearTimeout(timer);
                timer = setTimeout(() => translate(textEditor.document.getText(selection)), 100);
            }
        }),
        // commands
        commands.registerCommand('extension.translateon', () => {
            if (isActive) {
                isActive = false;
                window.showInformationMessage('Translate off!');
                statusBarItem.dispose();
                statusBarItem = null;
            } else {
                isActive = true;
                window.showInformationMessage('Translate on!');
                statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
                updateTranslator();
            }
        }),
        commands.registerCommand('extension.translateReplace', () => {
            if (isActive) {
                let { activeTextEditor }: { activeTextEditor: TextEditor } = window;
                activeTextEditor.edit((edit: TextEditorEdit) =>
                    edit.replace(activeTextEditor.selection, statusBarItem.text)
                );
            }
        })
    );

}

// this method is called when your extension is deactivated
export function deactivate() { }
