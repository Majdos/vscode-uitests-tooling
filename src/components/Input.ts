import { expect } from 'chai';
import {
	Input as IInput,
	InputBox,
	Key,
	WebElementPromise
} from 'vscode-extension-tester';
import { WebElementConditions } from '..';
import { repeat } from '../conditions/Repeat';

interface InputTestProperties {
	text?: string;
	message?: string;
	placeholder?: string;
	quickPicks?: string[];
	isPassword?: boolean;
	hasProgress?: string;
}

/**
 * Input element class which extends functionality of InputBox.
 * Use this implementation when InputBox implementation is unstable in your testing environment. 
 */
class Input extends InputBox {

	constructor() {
		super();
	}

	/**
	 * Get <input> html element
	 * @returns WebElementPromise resolving to <input> element
	 */
	public input(): WebElementPromise {
		try {
			return this.findElement(Input.locators.Input.input);
		}
		catch (e) {
			if (e.name === "NoSuchElementError") {
				throw new Error(`Could not locate Input element. This might happen when VS Code input element has not been used since last test run.\n${e}`);
			}
			else {
				throw e;
			}
		}
	}

	/**
	 * input.getAttribute('value') does not always return actual value.
	 * @returns actual value of input
	 */
	private async getInputValue(): Promise<string> {
		const input = await this.input();
		let value = await input.getDriver().executeScript("arguments[0].value", input);

		if (value === null || value === undefined) {
			value = ""; 
		}

		return value as string;
	}

	/**
	 * Clear input field. 
	 * 
	 * Algorithm:
	 * 1. Text is deleted by pressing 'backspace' and 'delete' keys.
	 * 2. If input text is empty('') method waits 'clearThreshold' milliseconds.
	 * 3. If input value is changed during wait, go to step 1
	 * 3. If input value is empty, method finishes successfully 
	 * 
	 * @param timeout timeout in milliseconds after method fails
	 * @param clearThreshold time duration when method successfully resolves.
	 */
	public async clear(timeout: number = 5000, clearThreshold: number = 2000): Promise<void> {
		let start = 0;

		try {
			await repeat(async () => {
				const input = await this.input();
				await WebElementConditions.waitUntilInteractive(input, timeout);
				const value = await this.getInputValue();
				const text = await this.getText();
				
				if (text === "" && value === "" && start === 0) {
					start = Date.now();
				}
				else if (text === "" && value === "" && Date.now() - start >= clearThreshold) {
					return true;
				}
				else if (text !== "" || value !== "") {
					start = 0;
				}

				await input.sendKeys(Key.BACK_SPACE, Key.DELETE);
				return false;
			}, {
				id: "Input.clear",
				timeout
			});
		}
		catch (e) {
			console.error(e);
			console.error(`Could not clear input field: "${await this.input().getText()}". Value: "${this.getInputValue()}".`);
			throw e;
		}
	}

	/**
	 * Set (by selecting all and typing) text in the input field
	 * @param text text to set into the input field
	 * @returns Promise resolving when the text is typed in
	 */
	public async setText(text: string, timeout: number = 5000): Promise<void> {
		const input = await this.input();
		await WebElementConditions.waitUntilInteractive(input, timeout);
		await input.click();
		await this.clear(timeout);
		await WebElementConditions.waitUntilInteractive(input, timeout);
		await input.sendKeys(text);
		await input.getDriver().wait(
			async () => await this.getText() === text,
			timeout,
			`Timed out setting text to "${text}". Input text: "${await this.getText()}"`
		);
	}

	/**
	 * Confirm the input field by pressing Enter
	 * @returns Promise resolving when the input is confirmed
	 */
	public async confirm(timeout: number = 3000): Promise<void> {
		await WebElementConditions.waitUntilInteractive(await this.input(), timeout);
		await super.confirm();
	}

	/**
	 * Tests Input element properties.
	 * @param testProperties properties to be tested
	 */
	public async test(testProperties: InputTestProperties): Promise<void> {
		if (testProperties.hasProgress !== undefined) {
			expect(await this.hasProgress()).to.equal(testProperties.hasProgress);
		}
		if (testProperties.isPassword !== undefined) {
			expect(await this.isPassword()).to.equal(testProperties.isPassword);
		}
		if (testProperties.message !== undefined) {
			expect(await this.getMessage()).to.equal(testProperties.message);
		}
		if (testProperties.placeholder !== undefined) {
			expect(await this.getPlaceHolder()).to.equal(testProperties.placeholder);
		}
		if (testProperties.quickPicks !== undefined) {
			const quickPicks = await this.getQuickPicks();
			const quickPickTexts = new Set(await Promise.all(quickPicks.map(pick => pick.getText())));
			expect(quickPickTexts).to.have.keys(testProperties.quickPicks);
		}
		if (testProperties.text !== undefined) {
			expect(await this.getText()).to.equal(testProperties.text);
		}
	}

	/**
	 * Type in text and confirm.
	 * @param text command palette input
	 * @param timeout 
	 */
	public async typeAndConfirm(text: string, timeout: number = 5000): Promise<void> {
		await this.setText(text, timeout);
		await this.confirm(timeout);
	}

	/**
	 * @deprecated Use Input class constructor instead.
	 */
	public static async getInstance(): Promise<Input> {
		return new Input();
	}

	/**
	 * Wait for quick picks to show in vscode. If any of required quick pick does show, Error is thrown.
	 * @param input vscode input element (must be visible in vscode)
	 * @param quickPickTexts array of texts to be verified in list of suggested quickpicks
	 * @param timeout time after waiting is stopped unsuccessfully
	 * @throws Error type when any quickpick did not show in suggested quickpicks
	 */
	public static async waitQuickPicks(input: IInput, quickPickTexts: string[], timeout: number = 5000): Promise<void> {
		const result = await input.getDriver().wait(async () => {
			const quickPickItems = await input.getQuickPicks().catch(() => []);

			if (quickPickItems.length === 0 && quickPickTexts.length > 0) {
				return false;
			}

			return quickPickItems.every(async q => {
				const text = await q.getText().catch(() => null);

				if (text === null) {
					return false;
				}

				return quickPickTexts.includes(text);
			});
		}, timeout).catch(() => false);

		if (!result) {
			const quickPickTexts = await Promise.all((await input.getQuickPicks()).map(q => q.getText()));
			throw new Error(`Could not find all quick picks.\nExpected: ${quickPickTexts.join(", ")}\nGot: ${quickPickTexts.join(", ")}`);
		}
	}
}

export { Input };
