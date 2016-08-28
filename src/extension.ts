'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument} from 'vscode';
import * as WebRequest from 'web-request';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let flag = false;
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    let translate = new Translate();
    context.subscriptions.push(translate);
    var disposable = commands.registerCommand('extension.translateon', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        if (!flag) {
            window.showInformationMessage('Translate on!');
            flag = true;
        } else {
            window.showInformationMessage('Translate off!');
            flag = false;
        }
    });

    context.subscriptions.push(disposable);
    // Add to a list of disposables which are disposed when this extension is deactivated.
}

// this method is called when your extension is deactivated
export function deactivate() {
}
class Translate {

    private _statusBarItem: StatusBarItem;
    private _disposable: Disposable;
    constructor() {
        if (!this._statusBarItem) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }
        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this.updateTranslate, this, subscriptions);
        this._disposable = Disposable.from(...subscriptions);
        this.updateTranslate();
        this._statusBarItem.show();
    }
    public updateTranslate() {


        let editor = window.activeTextEditor;
        if (!flag || !editor) {
            this._statusBarItem.hide();
            return;
        }

        let doc = editor.document;
        let str = doc.getText(editor.selection)
        this.dotranslate(str);

    }
    private dotranslate(str) {

        var statusBarItem = this._statusBarItem
        WebRequest.get('http://fanyi.baidu.com/v2transapi?query=' + str + '&to=zh').then(function (TResult) {
            var res = JSON.parse(TResult.content.toString());
            if (res.error) return;
            // if (res.trans_result.data.length > 1) {
            //     window.showInformationMessage(res.trans_result.data.map(v=>v.dst).join(' '))
            // }
            // else {
                statusBarItem.text = res.trans_result.data[0].dst;
                statusBarItem.show();
            // }
        });
    }

    dispose() {
        this._statusBarItem.dispose();
        this._disposable.dispose();
    }
}
