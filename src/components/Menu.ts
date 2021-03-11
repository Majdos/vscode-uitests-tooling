import * as fs from "fs";
import * as path from "path";
import { Input } from "./Input";
import { Dialog, openFolderWaitCondition } from "./Dialog";
import { SideBarView, TitleBar, until, VSBrowser } from "vscode-extension-tester";

export enum OpenMethod {
	DIALOG, INPUT
}

export interface OpenMenuOptions {
	/**
	 * timeout in ms
	 */
	timeout?: number;
	/**
	 * Open file/folder method. Can be INPUT - command palette method or DIALOG - native dialog method. 
	 */
	openMethod?: OpenMethod;
}

export class Menu {
	constructor() { }

	/**
	 * Default open file/folder method.
	 */
	public static defaultOpenMethod = OpenMethod.DIALOG;

	static async openFolder(folderPath: string, options?: OpenMenuOptions): Promise<void> {
		if (!fs.existsSync(folderPath)) {
			throw new Error(`Folder "${folderPath}" does not exist.`);
		}

		if (!fs.statSync(folderPath).isDirectory()) {
			throw new Error(`"${folderPath}" is not folder.`);
		}

		const timeout = options?.timeout || 30000;
		const method = options?.openMethod || Menu.defaultOpenMethod;
		const menu = new TitleBar();
		await menu.select("File", "Open Folder...");

		switch (method) {
			case +OpenMethod.INPUT:
				const input = new Input();
				console.log(`Opening folder: ${folderPath}`);
				await input.typeAndConfirm(folderPath, timeout);
				await openFolderWaitCondition(
					path.basename(folderPath),
					timeout
				);
				await menu.getDriver().wait(async () => {
					try {
						return await input.isDisplayed() === false;
					}
					catch (e) {
						if (e.name === "StaleElementReferenceError") {
							return true;
						}
						return false;
					}
				}, timeout);
				await VSBrowser.instance.waitForWorkbench();
				break;
			case +OpenMethod.DIALOG:
				await Dialog.openFolder(folderPath, timeout);
				break;
			default:
				throw new Error("Not implemented");
		}
	}

	static async openFile(filePath: string, options?: OpenMenuOptions): Promise<void> {
		if (!fs.existsSync(filePath)) {
			throw new Error(`File "${filePath}" does not exist.`);
		}

		if (!fs.statSync(filePath).isFile()) {
			throw new Error(`"${filePath}" is not file.`);
		}

		const timeout = options?.timeout || 30000;
		const method = options?.openMethod || Menu.defaultOpenMethod;
		const menu = new TitleBar();
		await menu.select("File", "Open File...");

		switch (method) {
			case +OpenMethod.INPUT:
				const input = new Input();
				await input.typeAndConfirm(filePath, timeout);
				break;
			case +OpenMethod.DIALOG:
				await Dialog.openFile(filePath);
				break;
			default:
				throw new Error("Not implemented");
		}
	}

	/**
	 * Close and save opened file 
	 * @param save true/false, save file before close editor or not
	 */
	static async closeFile(save: boolean = true): Promise<void> {
		const titleBar = new TitleBar();
		if (save) {
			await titleBar.select("File", "Save");
		} else {
			await titleBar.select("File", "Revert File");
		}
		await titleBar.select("File", "Close Editor");
	}

	/**
	 * Close opened folder
	 */
	static async closeFolder(folderPath: string, timeout: number): Promise<void> {
		let titleBar = new TitleBar();
		const section = await new SideBarView().getContent().getSection(path.basename(folderPath));
		await titleBar.select("File", "Close Folder");
		await titleBar.getDriver().wait(until.stalenessOf(section), timeout);
	}
}
