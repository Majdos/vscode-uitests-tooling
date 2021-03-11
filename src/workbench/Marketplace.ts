import {
	ActivityBar,
	ExtensionsViewItem,
	ExtensionsViewSection,
	SideBarView,
	ViewControl
} from 'vscode-extension-tester';

type ExtensionCategory = "Disabled" | "Enabled" | "Installed" | "Outdated" | "Other Recommendations" | "Marketplace" | "Popular";
const EXTENSION_CATEGORIES = ["Disabled", "Enabled", "Installed", "Outdated", "Other Recommendations", "Marketplace", "Popular"];

/**
 * ExtensionsViewSection facade class
 * @author Marian Lorinc <mlorinc@redhat.com>
 */
class Marketplace {
	private constructor(private _extensionView: ViewControl, private _marketplaceSideBar: SideBarView) { 
	}

	/**
	 * Gets marketplace section
	 * @param section name of section,
	 * @returns promise which resolves to ExtensionsViewSection
	 */
	public async getExtensionsSection(section: ExtensionCategory): Promise<ExtensionsViewSection> {
		return await this._marketplaceSideBar.getContent().getSection(section) as ExtensionsViewSection;
	}

	public async getAnyExtensionSection(): Promise<ExtensionsViewSection> {
		for (const category of EXTENSION_CATEGORIES) {
			try {
				return await this.getExtensionsSection(category as ExtensionCategory);
			}
			catch {
				continue;
			}
		}
		throw new Error(`Could not find any of following sections: ${EXTENSION_CATEGORIES.join(", ")}`);
	};

	/**
	 * Gets enabled section
	 * @returns promise which resolves to ExtensionsViewSection
	 */
	public async getEnabledExtensionsSection(): Promise<ExtensionsViewSection> {
		return this.getExtensionsSection("Enabled");
	}

	/**
	 * Gets disabled section
	 * @returns promise which resolves to ExtensionsViewSection
	 */
	public async getDisabledExtensionsSection(): Promise<ExtensionsViewSection> {
		return this.getExtensionsSection("Disabled");
	}

	/**
	 * Gets recommended section
	 * @returns promise which resolves to ExtensionsViewSection
	 */
	public async getRecommendedExtensionsSection(): Promise<ExtensionsViewSection> {
		return this.getExtensionsSection("Other Recommendations");
	}

	/**
	 * Finds extension in marketplace. Leaves search bar with title value.
	 * @param title display name of extension
	 * @param timeout timeout
	 * @param sectionTitle Marketplace section where extension is listed.
	 * @returns promise which resolves to ExtensionsViewItem(extension)
	 */
	public async findExtension(title: string, timeout: number = 5000, sectionTitle?: ExtensionCategory): Promise<ExtensionsViewItem> {
		const section = sectionTitle ? await this.getExtensionsSection(sectionTitle) : await this.getAnyExtensionSection();
		let extension = await section.findItem(title);

		if(extension === undefined) {
			extension = await section.getDriver().wait(async () => {
				const marketplaceSection = await this.getAnyExtensionSection();
				const extensions = await marketplaceSection.getVisibleItems();

				for (const extension of extensions) {
					if (await extension.getTitle() === title) {
						return extension;
					}
				}

				return undefined;
			}, timeout, "Timed out: Could not find extension");
		}
		
		return extension as ExtensionsViewItem;
	}

	/**
	 * Clears search bar
	 */
	public async clearSearch(): Promise<void> {
		const handler = await this.getAnyExtensionSection();
		return handler.clearSearch();
	}

	/**
	 * Closes marketplace 
	 */
	public async close(): Promise<void> {
		return this._extensionView.closeView();
	}

	/**
	 * Opens marketplace
	 * @returns marketplace handler
	 */
	public static async open(): Promise<Marketplace> {
		const extensionView = await new ActivityBar().getViewControl("Extensions");
		if (extensionView === undefined) {
			throw new Error("Extension view control is undefined.");
		}
		const marketplaceView = await extensionView.openView();
		return new Marketplace(extensionView, marketplaceView);
	}

	/**
	 * Gets open instance of marketplace
	 * @returns marketplace handler
	 */
	public static async getInstance() {
		const extensionView = await new ActivityBar().getViewControl("Extensions");
		if (extensionView === undefined) {
			throw new Error("Extension view control is undefined.");
		}
		return new Marketplace(extensionView, new SideBarView());
	}
}

export { Marketplace };
