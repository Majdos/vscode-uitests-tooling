import * as path from 'path';
import { ActivityBar, By, SideBarView, TitleBar, until, VSBrowser } from 'vscode-extension-tester';
import { DialogHandler, OpenDialog } from 'vscode-extension-tester-native';
import { repeat } from "../conditions/Repeat";

/**
 * Handles File Dialogs 
 * @author Dominik Jelinek <djelinek@redhat.com>
 */
class Dialog {
	private constructor() { }

	/**
	 * Open file with specified 'path' via Open File Dialog (File > Open File...)
	 * @param path path to the specific file
	 * @returns resolved dialog
	 */
	public static async openFile(path?: string): Promise<OpenDialog> {
		await new TitleBar().select('File', 'Open File...');
		const dialog = await openDialog(path);
		await dialog.confirm();
		return dialog;
	}

	/**
	 * Close and save opened file 
	 * @param save true/false, save file before close editor or not
	 */
	public static async closeFile(save: boolean = true): Promise<void> {
		const titleBar = new TitleBar();
		if (save) {
			await titleBar.select("File", "Save");
		} else {
			await titleBar.select("File", "Revert File");
		}
		await titleBar.select("File", "Close Editor");
	}

	/**
	 * Open folder with specified 'path' via Open Folder Dialog (File > Open Folder...)
	 * @param path path to the specific folder
	 * @returns resolved dialog
	 */
	public static async openFolder(filePath: string, timeout?: number): Promise<OpenDialog> {
		const menu = new TitleBar();
		await menu.select('File', 'Open Folder...');
		const dialog = await handleOpenFolder(filePath);
		await openFileExplorer();
		await openFolderWaitCondition(
			path.basename(filePath),
			timeout
		);
		return dialog;
	}

	/**
	 * Close opened folder
	 */
	public static async closeFolder(timeout: number = 30000): Promise<void> {
		let titleBar = new TitleBar();
		await titleBar.select("File", "Close Folder");
		await repeat(async () => {
			titleBar = new TitleBar();
			const parts = (await titleBar.getTitle()).split("-").map((p) => p.trim());
			return parts.length === 2 && parts[0] === "Welcome";
		}, { timeout, log: true, id: "Close folder" });
	}

	/**
	 * Selects path and confirms dialog
	 * @param path path to be inputted to dialog
	 * @returns promise which resolves with dialog
	 * @author Marian Lorinc <mlorinc@redhat.com>
	 */
	public static async confirm(path?: string): Promise<OpenDialog> {
		const dialog = await openDialog(path);
		await dialog.confirm();
		return dialog;
	}

	/**
	 * Selects path and cancels dialog
	 * @param path path to be inputted to dialog
	 * @returns promise which resolves with dialog
	 * @author Marian Lorinc <mlorinc@redhat.com>
	 */
	public static async cancel(path?: string): Promise<OpenDialog> {
		const dialog = await openDialog(path);
		await dialog.cancel();
		return dialog;
	}
}

async function openDialog(path: string = ""): Promise<OpenDialog> {
	const dialog = await DialogHandler.getOpenDialog();
	if (dialog === null) {
		return await Promise.reject('Could not open dialog!');
	}
	await dialog.selectPath(path);
	return dialog;
}

async function handleOpenFolder(filePath: string): Promise<OpenDialog> {
	const dialog = await openDialog(filePath);
	await dialog.confirm();
	return dialog;
}

async function openFileExplorer(): Promise<void> {
	const activityBar = new ActivityBar();
	const viewControl = await activityBar.getViewControl("Explorer");

	if (viewControl) {
		await viewControl.openView();
	}
	else {
		throw new Error("Explorer is undefined");
	}
}

async function openFolderWaitCondition(folderName: string, timeout?: number): Promise<void> {
	await VSBrowser.instance.driver.wait(async () => {
		try {
			const section = await new SideBarView().getContent().getSection(folderName);
			const html = await section.getDriver().wait(until.elementLocated(By.css("html")), 150);
			return await section.isDisplayed() && await section.isEnabled() && html;
		}
		catch {
			return false;
		}
	}, timeout, `Timed out: openFolderWaitCondition('${folderName}', ${timeout})`);
}

export { Dialog, openFolderWaitCondition };
