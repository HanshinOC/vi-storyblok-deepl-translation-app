<template >
	<div>
		<div v-if="showConfigurationScreen">
			<ConfigurationScreen
				@close="switchTabs"
				@updateApiKey="updateApiKey"
				@updateTranslationMode="updateTranslationMode"
				@updateWorkFlowStatus="updateWorkFlowStatus"
				:deeplKey="apiKey"
				:mode="modeOfTranslation"
				:workflowId="workFlowStatusId"
				:deeplKeyObj="apiKeyObj"
				:modeObj="modeOfTranslationObj"
				:workflowObj="workFlowStatusObj"
			/>
		</div>
		<div class="bodyFont" v-if="!showConfigurationScreen">
			<div v-if="!loadingContext">
				<el-row v-if="!languagesAvailable">
					<el-alert
						show-icon
						title="No languages found"
						type="error"
						description="Please setup translation mode and add languages to use the application. 
          For more info visit: https://www.storyblok.com/docs/guide/in-depth/internationalization"
						:closable="false"
					>
					</el-alert>
				</el-row>
				<el-row v-show="invalidKey">
					<el-alert
						show-icon
						title="Invalid key."
						type="error"
						description="Please enter a valid DeepL api key in app configuration."
						:closable="false"
					>
					</el-alert>
				</el-row>
				<el-row v-show="invalidMode">
					<el-alert
						show-icon
						title="Invalid Translation Mode."
						type="error"
						description="Please select a valid translation mode from app configuration."
						:closable="false"
					>
					</el-alert>
				</el-row>

				<el-row></el-row>
				<p class="less-prominent label" v-if="languagesAvailable">
					Content will be translated from:
					<strong>{{ getlangName(currentLanguage) }}</strong>
				</p>
				<p
					class="less-prominent label"
					v-if="getTranslationModeName(modeOfTranslation)"
				>
					Translation Mode is set to:
					<strong>{{ getTranslationModeName(modeOfTranslation) }}</strong>
				</p>
				<el-row />

				<el-row v-if="modeOfTranslation === 'FIELD_LEVEL'">
					<p class="required label" v-if="languagesAvailable">Translate Into</p>

					<el-checkbox-group
						v-for="locale in availableLanguages"
						:disabled="invalidKey || invalidMode"
						:key="locale.lang"
						v-model="requestedLanguagesForFieldLevel"
					>
						<el-checkbox :label="locale.lang">
							{{ getAvailableLanguagesName(locale.lang) }}
						</el-checkbox>
					</el-checkbox-group>
				</el-row>

				<el-row v-else>
					<p class="required label" v-if="languagesAvailable">Translate Into</p>

					<el-radio-group
						v-for="locale in availableLanguages"
						:disabled="invalidKey || invalidMode"
						:key="locale.lang"
						v-model="requestedLanguagesForFolderLevel"
					>
						<el-radio :label="locale.lang">
							{{ getAvailableLanguagesName(locale.lang) }}
						</el-radio>
					</el-radio-group>
				</el-row>

				<el-row>
					<el-col :span="12">
						<el-button type="plain" size="mini" v-on:click="switchTabs"
							>Edit Configuration</el-button
						>
					</el-col>
					<el-col :span="11" :offset="1">
						<el-button
							v-on:click="sendTranslationRequest"
							:loading="waitingForTranslationResponse"
							:disabled="invalidKey || invalidMode || !languagesAvailable"
							type="primary"
							size="mini"
						>
							Translate
						</el-button>
					</el-col>
				</el-row>
			</div>
			<div v-else v-loading="true"></div>
			<footer>
				<div id="footer-text">
					<span>
						Developed by
						<a href="https://www.virtual-identity.com/" target="_blank"
							>Virtual Identity AG,</a
						>
						a certified Storyblok Partner.
					</span>
				</div>
				<div class="badge">
					<a
						href="https://github.com/virtualidentityag/vi-storyblok-deepl-translation-app"
						target="_blank"
					>
						<img
							src="https://badges.frapsoft.com/os/v2/open-source.svg?v=103"
							alt="Open Source"
						/>
					</a>
				</div>
			</footer>
		</div>
	</div>
</template>

<script>
import { deepLTranslate } from "./../utils/deepl-services";
import {
	fetchStory,
	updateStory,
	fetchDataSourceEntries,
	workFlowStageChange,
} from "../utils/services";
import { languageCodes } from "./../utils/language-codes";

import ConfigurationScreen from "./../components/ConfigurationScreen.vue";
import {
	API_KEY_DATASOURCE_NAME,
	API_KEY_INITIAL_VALUE,
	FIELD_LEVEL,
	FOLDER_LEVEL,
	MODE_DATASOURCE_NAME,
	MODE_INITIAL_VALUE,
	WORKFLOW_STATUS_DATASOURCE_NAME,
	WORKFLOW_STATUS_INITIAL_VALUE,
} from "../utils/constants";

export default {
	name: "index",
	components: {
		ConfigurationScreen,
	},
	data() {
		return {
			showConfigurationScreen: false,
			story: undefined,
			loadingContext: true,
			languagesAvailable: false,
			currentLanguage: "",

			apiKey: "",
			apiKeyObj: undefined,
			invalidKey: true,

			workFlowStatusId: "",
			workFlowStatusObj: undefined,
			changeWorkFlowStatus: false,

			modeOfTranslation: "",
			modeOfTranslationObj: undefined,
			invalidMode: true,

			availableLanguages: [],
			requestedLanguagesForFieldLevel: [],
			requestedLanguagesForFolderLevel: "",
			translationMode: "",
			spaceId: this.$route.query.space_id,

			waitingForTranslationResponse: false,

		};
	},

	mounted() {
		if (window.top === window.self) {
			window.location.assign("https://app.storyblok.com/oauth/tool_redirect");
		}
		else {
			window.addEventListener("message", this.processMessage, false);

			//Use getContext to get the current story
			window.parent.postMessage(
				{
					action: "tool-changed",
					// tool: "virtual-identity-ag@auto-translations-app",
					tool: "virtual-identity-ag@translations-backup-app",
					event: "getContext",
				},
				"https://app.storyblok.com"
			);

			// Use heightChange to change the height of the tool
			window.parent.postMessage(
				{
					action: "tool-changed",
					// tool: "virtual-identity-ag@auto-translations-app",
					tool: "virtual-identity-ag@translations-backup-app",
					event: "heightChange",
					height: 550,
				},
				"https://app.storyblok.com"
			);

			this.initDataSources();
		}
	},

	methods: {
		// to get the current story once app is loaded
		processMessage(event) {
			if (event.data && event.data.action == "get-context") {
				this.loadingContext = false;
				this.story = event.data.story;
				this.currentLanguage =
					event.data.language !== "" ? event.data.language : "Default Language";

				if (event.data.story.localized_paths.length > 0) {
					this.languagesAvailable = true;
					this.availableLanguages = Array.from(
						event.data.story.localized_paths
					);
				}
			}
		},

		async initDataSources() {
			let dataSourceObj = await fetchDataSourceEntries(this.spaceId);

			if (dataSourceObj) {
				const deeplKeyObj = dataSourceObj.find(
					(obj) => obj.name === API_KEY_DATASOURCE_NAME
				);
				const translationModeObj = dataSourceObj.find(
					(obj) => obj.name === MODE_DATASOURCE_NAME
				);
				const workFlowStatusObj = dataSourceObj.find(
					(obj) => obj.name === WORKFLOW_STATUS_DATASOURCE_NAME
				);

				const invalidKeyValue = deeplKeyObj.value !== API_KEY_INITIAL_VALUE ? false : true;
				const invalidModeValue = translationModeObj.value !== MODE_INITIAL_VALUE ? false : true;
				const changeWorkFlowStatusValue = workFlowStatusObj.value === WORKFLOW_STATUS_INITIAL_VALUE ? false : true;

				this.apiKey = deeplKeyObj.value;
				this.apiKeyObj = deeplKeyObj;
				this.invalidKey = invalidKeyValue;

				this.modeOfTranslation = translationModeObj.value;
				this.modeOfTranslationObj = translationModeObj;
				this.invalidMode = invalidModeValue;

				this.workFlowStatusId = workFlowStatusObj.value;
				this.workFlowStatusObj = workFlowStatusObj;
				this.changeWorkFlowStatus = changeWorkFlowStatusValue;

				this.showConfigurationScreen = invalidKeyValue || invalidModeValue ? true : false;
			}
		},

		switchTabs() {
			this.showConfigurationScreen = !this.showConfigurationScreen;
		},

		updateApiKey(apiValues) {
			if (apiValues.key !== API_KEY_INITIAL_VALUE) {
				this.invalidKey = false;
			} else {
				this.invalidKey = true;
			}
			this.apiKey = apiValues.key;
			this.apiKeyObj = { ...apiValues.obj };
		},

		updateWorkFlowStatus(workFlowStatusValues) {
			if (workFlowStatusValues.key !== WORKFLOW_STATUS_INITIAL_VALUE)
				this.changeWorkFlowStatus = true;
			else
				this.changeWorkFlowStatus = false;

			this.workFlowStatusId = workFlowStatusValues.id;
			this.workFlowStatusObj = { ...workFlowStatusValues.obj };
		},

		updateTranslationMode(translationModeValues) {
			if (translationModeValues.mode.trim() !== FOLDER_LEVEL && translationModeValues.mode.trim() !== FIELD_LEVEL)
				this.invalidMode = true;
			else
				this.invalidMode = false;

			this.modeOfTranslation = translationModeValues.mode;
			this.modeOfTranslationObj = { ...translationModeValues.obj };
		},

		updateWorkFlowStatusOfStory() {
			if (this.changeWorkFlowStatus)
				workFlowStageChange(this.spaceId, this.story.id, this.workFlowStatusId);
		},

		// return language name for the given code
		getlangName(langCode) {
			if (langCode !== "Default Language")
				return languageCodes.find((lang) => lang.code === langCode).name;
			else return langCode;
		},

		getTranslationModeName(mode) {
			if (mode === FOLDER_LEVEL) return "Folder Level";
			else if (mode === FIELD_LEVEL) return "Field Level";
			else return false;
		},

		getAvailableLanguagesName(code) {
			return code + " - " + this.getlangName(code);
		},

		transformLanguageString(languageString) {
			const splittedString = languageString.split("-");
			return splittedString.reduce(
				(previousValue, currentValue) =>
					previousValue.trim() + "_" + currentValue.trim()
			);
		},

		// generateXML(obj) {
		// 	let str = "";

		// 	for (let key in obj) {
		// 		str += `${"<" + [key] + ">" + [obj[key]] + "</" + [key] + ">"}`;
		// 	}

		// 	return str;
		// },

		generateXML(obj) {
			let str = "";

			for (let key in obj) {
				if (!key.includes('richtext') && !key.includes('color') && !key.includes('style') && !key.includes('size'))
					str += `${"<" + [key] + ">" + [obj[key]] + "</" + [key] + ">"}`;
			}

			return str;
		},

		convertXMLToJSON(xml, extractedFields) {
			let obj = {};

			for (let key in extractedFields) {
				let _key = xml.substring(xml.indexOf("<") + 1, xml.indexOf(">"));
				let _value = xml.substring(xml.indexOf(">") + 1, xml.indexOf("</"));

				xml = xml.substring(xml.indexOf("><") + 1, xml.length);

				let removed = JSON.stringify(_value).replace(`"\"`, `"`);
				removed = removed.replace(`\""`, `"`);

				Object.assign(obj, { [_key]: _value });
			}

			return obj;
		},

		// extracts the fields from story object with the help of story json returned by export.json api
		extractingFields(storyJson, storyObject) {
			let translatableContents = {};
			let languageStr =
				this.currentLanguage === "Default Language"
					? ""
					: `__i18n__${this.transformLanguageString(this.currentLanguage)}`;

			for (let keys in storyJson) {
				let extracted = keys.split(":"); // splitting e.g {4e272c60-a59e-4c1d-b7bc-115b920588e6:button:text: "Call to action"} in 3 parts
				let extractedContent = [];
				let keyBackUp = "";
				let checkFurther = true;

				if (extracted.length > 1) {
					for (let _keys in storyObject.content) {
						if (storyObject.content._uid === extracted[0]) { // if the field is directly inside content object
							if (storyObject.content.component === extracted[1] && storyObject.content[extracted[2]]) { // just checking the component and field name for it
								Object.assign(translatableContents, {
									[`${keys}`]:
										storyObject.content[`${extracted[2]}${languageStr}`],
								});
								checkFurther = false;
							}
						} else if (
							JSON.stringify(storyObject.content[_keys]).includes(extracted[0])
						) {
							extractedContent = Array.from(storyObject.content[_keys]);
						}
					}

					if (checkFurther) {
						do {
							let existsInKeyName = "";

							if (keyBackUp !== "")
								extractedContent = extractedContent[keyBackUp];

							extractedContent = extractedContent.reduce(
								(previousValue, currentValue) => {
									if (JSON.stringify(previousValue).includes(extracted[0]))
										return previousValue;
									//determining in which obj the _uid is present
									else return currentValue;
								}
							);

							if (extractedContent.component !== extracted[1]) {
								//checking if we are in the correct obj, extracted¢[1] includes the name of the component
								for (let _keys in extractedContent) {
									if (
										JSON.stringify(extractedContent[_keys]).includes(
											extracted[1]
										)
									) {
										//determining if the object is further nested where out content is present
										existsInKeyName = _keys; //and the name of the key in which it is present
										break;
									}
								}
							}

							if (
								!Array.isArray(extractedContent[existsInKeyName]) &&
								typeof extractedContent[existsInKeyName] === "object"
							)
								if (
									extractedContent._uid == extracted[0] &&
									extractedContent.component == extracted[1]
								)
									//if the key is the type of object {}
									break;

							if (extractedContent._uid == extracted[0])
								//if _uid has been matched, copy the value of 2nd index to 1st since extracted[0] is being used above
								extracted[0] = extracted[1];

							keyBackUp = existsInKeyName; //creating a backup of existsInKeyName
						} while (extractedContent.component !== extracted[1]); //loop until component name is not matched

						if (extractedContent) {
							if (extractedContent.component.includes('richtext'))
								Object.assign(translatableContents, { [`${keys}`]: JSON.stringify(extractedContent.text) }); // creating an object of translatable fields
							else
								Object.assign(translatableContents, { [`${keys}`]: extractedContent[`${extracted[2]}${languageStr}`] }); // creating an object of translatable fields
						}
					}
				}
			}

			return translatableContents;
		},

		// storyJsonWithLang only contains the translatable fields
		// both objects are being compared and those keys which are not present in storyJsonWithLang are being removed from storyJson
		removeUnwanted(storyJson, storyJsonWithLang) {
			let newStoryJson = {};

			for (let keyOfStoryJson in storyJson) {
				if (storyJsonWithLang.hasOwnProperty(keyOfStoryJson)) {
					Object.assign(newStoryJson, {
						[keyOfStoryJson]: JSON.stringify(storyJson[keyOfStoryJson]),
					});
				}
			}

			return newStoryJson;
		},

		closePage() {
			setTimeout(() => {
				window.top.close(
					`${document.referrer}#!/me/spaces/${this.spaceId}/stories/0/0/${this.story.id}`
				);
			}, 1000);
		},

		async folderLevelTranslationRequest(
			storyObject,
			storyJson,
			extractedFieldsXML,
			sourceLanguage
		) {
			const response = await deepLTranslate(
				extractedFieldsXML,
				this.requestedLanguagesForFolderLevel,
				sourceLanguage,
				this.apiKey
			);

			if (response) {
				this.waitingForTranslationResponse = false

				let convertedXml = {
					...this.convertXMLToJSON(
						response.translations[0].text,
						storyJson
					),
					language: "default",
					page: this.story.id + "",
					text_nodes: JSON.parse(storyJson.text_nodes),
					url: storyJson.url,
				};


				storyObject = await updateStory(
					this.spaceId,
					this.story.id,
					JSON.stringify(convertedXml)
				); // folder level

				if (storyObject) {
					this.successMessage();

					this.updateWorkFlowStatusOfStory();

					window.open(
						`${document.referrer}#!/me/spaces/${this.spaceId}/stories/0/0/${this.story.id}?update=true`
					);
					this.closePage();
				} else {
					this.languageErrorMessage(this.requestedLanguagesForFolderLevel);
				}
			}
		},

		async fieldLevelTranslationRequest(
			storyObject,
			storyJson,
			extractedFieldsXML,
			sourceLanguage
		) {

			this.requestedLanguagesForFieldLevel.forEach(
				async (requestedLanguage, index) => {

					const response = await deepLTranslate(
						extractedFieldsXML,
						requestedLanguage,
						sourceLanguage,
						this.apiKey
					);

					if (response) {
						this.waitingForTranslationResponse = false

						let convertedXml = {
							...this.convertXMLToJSON(
								response.translations[0].text,
								storyJson
							),
							language: requestedLanguage,
							page: this.story.id + "",
							text_nodes: JSON.parse(storyJson.text_nodes),
							url: storyJson.url,
						};

						storyObject = await updateStory(
							this.spaceId,
							this.story.id,
							JSON.stringify(convertedXml),
							requestedLanguage
						);

						if (storyObject) {
							this.successMessage();

							if (index === this.requestedLanguagesForFieldLevel.length - 1) {

								this.updateWorkFlowStatusOfStory();

								window.open(
									`${document.referrer}#!/me/spaces/${this.spaceId}/stories/0/0/${this.story.id}?update=true`
								);
								this.closePage();
							}
						} else {
							this.languageErrorMessage(requestedLanguage);
						}
					}
				}
			);
		},

		async sendTranslationRequest() {
			if (
				this.requestedLanguagesForFieldLevel.length > 0 ||
				this.requestedLanguagesForFolderLevel !== ""
			) {
				if (
					!this.requestedLanguagesForFieldLevel.includes(this.currentLanguage)
				) {
					this.waitingForTranslationResponse = true

					let updatedStory = await fetchStory(
						this.spaceId,
						this.story.id,
						this.availableLanguages[0].lang
					);

					let storyObject = updatedStory.storyObj;

					let sourceLanguage =
						this.currentLanguage !== "Default Language"
							? this.currentLanguage.split("-")[0].toUpperCase()
							: "";


					if (this.modeOfTranslation === FOLDER_LEVEL) {

						this.folderLevelTranslationRequest(
							storyObject,
							updatedStory.storyJSON,
							this.generateXML(updatedStory.storyJSON), // converting json to xml
							sourceLanguage
						);
					}
					else {

						this.fieldLevelTranslationRequest(
							storyObject,
							updatedStory.storyJSONWithLang,
							this.generateXML(updatedStory.storyJSONWithLang), // converting json to xml
							sourceLanguage
						);
					}
				} else
					this.customErrorMessage(
						"Requested languages should not include source language"
					);
			} else
				this.customErrorMessage("Please select at least one target language");
		},

		successMessage() {
			this.$message({
				message: "Translation Successful!",
				type: 'success',
				showClose: true,
			});
		},
		customErrorMessage(_message) {
			this.$message.error({
				message: _message,
				type: 'error',
				showClose: true,
			});
		},
		languageErrorMessage(lang) {
			this.$message.error({
				message: `Error occurred for language ${this.getlangName(lang)}. Please try again later.`,
				type: 'error',
				showClose: true,
			});
		},
	},
};
</script>

<style>
.bodyFont {
	font-family: "Roboto", sans-serif;
}

.bodyFont .el-row {
	margin-bottom: 20px;
}

.bodyFont .el-row:last-child {
	margin-bottom: 0;
}

.el-icon-success:before {
	content: "\e79c" !important;
}

.el-icon-error:before {
	content: "\e7a3" !important;
}

.el-alert {
	border-radius: 4px;
}

.el-alert--error.is-light {
	background-color: #ffd7d5;
	color: #1b243f;
}
.el-alert--error.is-light .el-alert__description {
	color: #1b243f;
}

.el-form-item__label {
	color: #1b243f;
}

.el-button {
	width: 100%;
	border-radius: 4px;
	color: #fff;
	min-height: 36px;
}

.el-button--plain {
	color: #1b243f;
	background-color: #fff;
	border-color: #dfe3e8;
}

.el-button--plain:focus {
	outline: 3px solid #f7f8f9;
	color: #1b243f;
}
.el-button--plain:hover {
	background-color: #eff1f3;
	border-color: #dfe3e8;
	color: #1b243f;
}

.el-button--primary {
	background: #00b3b0;
	border: 1px solid #00b3b0;
}

.el-button--primary:focus,
.el-button--primary:hover {
	background: #00b3b0;
	border-color: #00b3b0;
}

.el-button--primary.is-active,
.el-button--primary:active {
	background: #00b3b0;
	border-color: #c6e2ff;
}

.el-button.is-disabled,
.el-button.is-disabled:focus,
.el-button.is-disabled:hover {
	cursor: not-allowed;
	background-image: none;
	border-color: #ebeef5;
	color: #b1b5be;
	background-color: #dfe3e8;
}
.el-checkbox {
	color: #1b243f;
}
.el-checkbox__input.is-checked .el-checkbox__inner,
.el-checkbox__input.is-indeterminate .el-checkbox__inner {
	background-color: #00b3b0;
	border: 1px solid #00b3b0;
}
.el-checkbox__label {
	color: #000000 !important;
}

.el-checkbox__input.is-checked {
	color: #00b3b0;
}
.el-checkbox__inner:hover {
	border-color: #00b3b0;
}
.el-checkbox__input.is-focus .el-checkbox__inner {
	border-color: #00b3b0;
}

.el-radio {
	color: #1b243f;
	width: 100%;
}

.el-radio-button__inner,
.el-radio-group {
	width: 100%;
}

.el-radio__label {
	color: #000000 !important;
}
.el-radio__input.is-checked {
	color: #00b3b0;
}

.el-radio__input.is-checked .el-radio__inner {
	border-color: #00b3b0;
	background: #00b3b0;
}
.el-radio__inner:hover {
	border-color: #00b3b0;
}

.label.required::after {
	content: "*";
	color: #ff6159 !important;
	margin-left: 4px;
}
.el-form-item.is-required:not(.is-no-asterisk)
	.el-form-item__label-wrap
	> .el-form-item__label:before,
.el-form-item.is-required:not(.is-no-asterisk) > .el-form-item__label:after {
	content: "*";
	color: #ff6159 !important;
	margin-left: 4px;
}
.el-form-item.is-required:not(.is-no-asterisk)
	.el-form-item__label-wrap
	> .el-form-item__label:before,
.el-form-item.is-required:not(.is-no-asterisk) > .el-form-item__label:before {
	content: "";
	color: #f56c6c;
	margin: 0px;
}

.less-prominent {
	font-size: 12px !important;
	line-height: 7px;
	color: #000000;
	font-weight: 400;
}

.label {
	font-weight: 500;
}

p,
span {
	font-size: 14px;
}

.clearfix:before,
.clearfix:after {
	display: table;
	content: "";
}

.clearfix:after {
	clear: both;
}

.box-card {
	width: 100%;
}

footer {
	padding: 5px 0px;
	border-top: 1px solid #ebeef5;
	box-sizing: border-box;
	margin-top: 30px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

footer span {
	font-size: 12px;
	color: #00000099;
	font-weight: 400;
	line-height: 16px;
}

#footer-text {
	margin-top: 24px;
}

footer img {
	width: 100px;
}

footer a {
	text-decoration: none;
	font-weight: 700;
	color: #00000099;
}

.badge {
	display: flex;
	align-items: flex-end;
	height: 6vh;
}
</style>