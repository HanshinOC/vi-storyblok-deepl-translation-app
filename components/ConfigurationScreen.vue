<template>
	<div>
		<div class="bodyFontStyle">
			<el-form
				:rules="rules"
				:model="ruleForm"
				ref="ruleForm"
				class="demo-ruleForm"
			>
				<el-col>
					<el-row>
						<el-form-item label="Deepl Api Key" prop="apiKey">
							<el-input v-model="ruleForm.apiKey"></el-input>
						</el-form-item>
					</el-row>
					<el-row>
						<el-form-item label="Translation Mode" required prop="modeOfTranslation">
							<el-radio
								v-model="ruleForm.modeOfTranslation"
								:label="mode.value"
								v-for="mode in ruleForm.translationModes"
								:key="mode.value"
							>
								{{ mode.label }}
							</el-radio>
						</el-form-item>
					</el-row>

					<el-row>
						<el-form-item
							label="Workflow Status After Translation"
							prop="workflowStatusId"
						>
							<el-select v-model="ruleForm.workflowStatusId" placeholder="Select">
								<el-option
									v-for="item in ruleForm.workflowStages"
									:key="item.id"
									:label="item.name"
									:value="item.id"
								>
								</el-option>
							</el-select>
						</el-form-item>
					</el-row>

					<el-form-item>
						<el-row>
							<el-col :span="12">
								<el-button type="plain" size="mini" v-on:click="closeSettings"
									>Cancel</el-button
								>
							</el-col>
							<el-col :span="11" :offset="1">
								<el-button
									type="primary"
									size="mini"
									@click="handleSubmit('ruleForm')"
									:disabled="disableUpdateBtn()"
									:loading="waitingForResponse"
									>Update</el-button
								>
							</el-col>
						</el-row>
					</el-form-item>
				</el-col>
			</el-form>
		</div>
	</div>
</template>
<script>

import { fetchWorkFlowStages, updateDataSourceEntries } from "../utils/services";
import {
	FIELD_LEVEL,
	FOLDER_LEVEL,
	MODE_INITIAL_VALUE,
	API_KEY_INITIAL_VALUE,
	WORKFLOW_STATUS_INITIAL_VALUE,
	API_KEY_DATASOURCE_NAME,
	MODE_DATASOURCE_NAME,
} from "../utils/constants";

export default {
	name: "ConfigurationScreen",
	props: ["deeplKey", "deeplKeyObj", "mode", "modeObj", "workflowId", "workflowObj"],
	data() {
		return {
			spaceId: this.$route.query.space_id,
			waitingForResponse: false,
			ruleForm: {
				apiKey: this.deeplKey === API_KEY_INITIAL_VALUE ? "" : this.deeplKey,
				apiKeyObj: this.deeplKeyObj,

				modeOfTranslation: this.mode === MODE_INITIAL_VALUE ? "" : this.mode,
				modeOfTranslationObj: this.modeObj,

				workflowStatusId: this.workflowId !== WORKFLOW_STATUS_INITIAL_VALUE ? parseInt(this.workflowId) : WORKFLOW_STATUS_INITIAL_VALUE,
				workflowStatusObj: this.workflowObj,
				workflowStages: [{ id: WORKFLOW_STATUS_INITIAL_VALUE, name: WORKFLOW_STATUS_INITIAL_VALUE }],

				spaceId: this.$route.query.space_id,

				translationModes: [
					{ value: FIELD_LEVEL, label: "Field Level" },
					{ value: FOLDER_LEVEL, label: "Folder Level" },
				],
			},
			rules: {
				apiKey: [
					{
						required: true,
						message: "Please input Deepl Api Key",
						trigger: "blur",
					},
				],
				modeOfTranslation: [
					{
						required: true,
						message: "Please select translation mode",
						trigger: "change",
					},
				],
			},
		};
	},
	mounted() {
		this.fetchStages()
	},

	methods: {
		async fetchStages() {
			this.ruleForm.workflowStages = this.ruleForm.workflowStages.concat(await fetchWorkFlowStages(this.spaceId))
		},
		disableUpdateBtn() {
			if (
				(this.ruleForm.apiKey !== this.deeplKey &&
					this.ruleForm.apiKey !== "") ||
				(this.ruleForm.modeOfTranslation !== this.mode &&
					this.ruleForm.modeOfTranslation !== "") ||
				(this.ruleForm.workflowStatusId != this.workflowId)
			) {
				return false;
			}
			else {
				return true;
			}

		},

		async handleSubmit(form) {
			this.$refs[form].validate(async (valid, fieldErrorObj) => {
				if (valid) {
					const updatedValues = [];

					if (this.ruleForm.apiKey !== this.deeplKey)
						updatedValues.push({
							...this.ruleForm.apiKeyObj,
							value: this.ruleForm.apiKey,
						});

					if (this.ruleForm.modeOfTranslation !== this.mode)
						updatedValues.push({
							...this.ruleForm.modeOfTranslationObj,
							value: this.ruleForm.modeOfTranslation,
						});


					if (this.ruleForm.workflowStatusId !== this.workflowId)
						updatedValues.push({
							...this.ruleForm.workflowStatusObj,
							value: this.ruleForm.workflowStatusId,
						});

					updatedValues.forEach(async (datasourceEntry, index) => {
						this.waitingForResponse = true
						let response = await updateDataSourceEntries(
							this.spaceId,
							datasourceEntry
						);

						if (response.status === 204) {

							if (index === updatedValues.length - 1) {
								this.waitingForResponse = false
								this.successMessage('Configuration(s) updated.');
							}

							switch (datasourceEntry.name) {
								case API_KEY_DATASOURCE_NAME:
									this.$emit("updateApiKey", {
										key: this.ruleForm.apiKey,
										obj: this.ruleForm.apiKeyObj,
									});
									break;
								case MODE_DATASOURCE_NAME:
									this.$emit("updateTranslationMode", {
										mode: this.ruleForm.modeOfTranslation,
										obj: this.ruleForm.modeOfTranslationObj,
									});
									break;
								default:
									this.$emit("updateWorkFlowStatus", {
										id: this.ruleForm.workflowStatusId,
										obj: this.ruleForm.workflowStatusObj,
									});
							}

						}
						else
							this.errorMessage();
					});
				} else {
					return false;
				}
			});
		},

		closeSettings() {
			this.$emit("close");
		},

		successMessage(message) {
			this.$message({
				message: `${message}`,
				type: 'success',
				showClose: true,
			});
		},
		errorMessage(_message) {
			this.$message.error({
				message: _message ?? "Something went wrong, try again later.",
				type: 'error',
				showClose: true,
			});
		},
	},
};
</script>

<style>
.bodyFontStyle {
	font-family: "Roboto", sans-serif;
}

.el-form-item__content {
	line-height: 21px;
}

.el-input.is-active .el-input__inner,
.el-input__inner:focus,
.el-input__inner:hover {
	border-color: #00b3b0;
	outline: 0;
}
.el-select {
	width: 100%;
}
.el-select .el-input__inner:focus,
.el-select .el-input__inner:hover {
	border-color: #00b3b0 !important;
}

.el-range-editor.is-active,
.el-range-editor.is-active:hover,
.el-select .el-input.is-focus .el-input__inner {
	border-color: #00b3b0;
}
.el-select-dropdown__item.selected {
	color: #00b3b0 !important;
	font-weight: 500;
}
.el-input__inner {
	color: #1b243f;
}

.el-message {
	min-width: 95%;
	font-family: "Roboto", SANS-SERIF;
	border-radius: 6px;
}

.el-message--success {
	background-color: #caecde;
	border-color: #caecde;
}

.el-message--error .el-message__content,
.el-message--success .el-message__content {
	color: #1b243f;
	font-weight: 500;
}

.el-icon-error {
	color: rgb(255, 97, 89) !important;
	font-weight: 500;
	font-size: x-large;
}

.el-icon-success {
	color: rgb(45, 180, 125) !important;
	font-weight: 500;
	font-size: x-large;
}

.el-message--error {
	background-color: #ffd7d5;
	border-color: #ffd7d5;
}

p {
	font-size: 14px;
}

.el-select-dropdown__item span {
	font-family: sans-serif;
}
.el-select-dropdown__item {
	color: #1b243f;
}
</style>
