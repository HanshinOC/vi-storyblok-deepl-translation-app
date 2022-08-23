<template>
	<div class="bodyFontStyle">
		<el-card class="box-card">
			<div slot="header" class="clearfix">
				<el-button
					style="float: right"
					type="primary"
					size="mini"
					v-on:click="closeSettings"
					>Close</el-button
				>
			</div>
			<el-form
				:rules="rules"
				:model="ruleForm"
				ref="ruleForm"
				size="mini"
				class="demo-ruleForm"
			>
				<el-col>
					<el-row>
						<el-form-item label="Deepl Api Key" required prop="apiKey">
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
							<el-select
								v-model="ruleForm.workflowStatusId"
								placeholder="Select"
								size="mini"
							>
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
						<el-button
							type="primary"
							@click="handleSubmit('ruleForm')"
							:disabled="disableUpdateBtn()"
							>Update</el-button
						>
					</el-form-item>
				</el-col>
			</el-form>
		</el-card>
	</div>
</template>
<script>
import { Notification } from "element-ui";
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

					updatedValues.forEach(async (datasourceEntry) => {
						let response = await updateDataSourceEntries(
							this.spaceId,
							datasourceEntry
						);

						if (response.status === 204) {
							this.successMessage(datasourceEntry.name);

							if (datasourceEntry.name === API_KEY_DATASOURCE_NAME) {
								this.$emit("updateApiKey", {
									key: this.ruleForm.apiKey,
									obj: this.ruleForm.apiKeyObj,
								});
							} else if (datasourceEntry.name === MODE_DATASOURCE_NAME) {
								this.$emit("updateTranslationMode", {
									mode: this.ruleForm.modeOfTranslation,
									obj: this.ruleForm.modeOfTranslationObj,
								});
							}
							else {
								this.$emit("updateWorkFlowStatus", {
									id: this.ruleForm.workflowStatusId,
									obj: this.ruleForm.workflowStatusObj,
								});
							}
						} else this.errorMessage();
					});
				} else {
					console.log("error submit!!", fieldErrorObj);
					return false;
				}
			});
		},

		closeSettings() {
			this.$emit("close");
		},

		successMessage(dataSource) {
			Notification({
				title: "Success",
				message: `${dataSource} updated successfully!`,
				type: "success",
			});
		},
		errorMessage(_message) {
			Notification({
				title: "Error",
				message: _message ?? "Something went wrong, try again later.",
				type: "error",
			});
		},
	},
};
</script>

<style>
.bodyFontStyle {
	font-family: sans-serif;
}
.el-notification__title {
	font-weight: 700;
	font-size: 16px;
	color: #303133;
	margin: 0;
	font-family: sans-serif;
}
.el-notification__content {
	font-size: 14px;
	line-height: 21px;
	margin: 6px 0 0;
	color: #606266;
	text-align: justify;
	font-family: sans-serif;
}
.el-notification {
	display: flex;
	width: 270px;
	padding: 14px 26px 14px 13px;
	border-radius: 8px;
	box-sizing: border-box;
	border: 1px solid #ebeef5;
	position: fixed;
	background-color: #fff;
	box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
	transition: opacity 0.3s, transform 0.3s, left 0.3s, right 0.3s, top 0.4s,
		bottom 0.3s;
	overflow: hidden;
}
p {
	font-size: 14px;
	color: #606266;
}
.error-text {
	color: #f56c6c;
	font-weight: bold;
}
.el-select-dropdown__item span {
	font-family: sans-serif;
}
</style>
