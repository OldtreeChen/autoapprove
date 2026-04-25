const crypto = require("crypto");

const BASE_URL = process.env.ECONTACT_BASE_URL || "https://econtact.ai3.cloud/ecp/";
const LOGIN_NAME = process.env.ECONTACT_USER;
const PASSWORD = process.env.ECONTACT_PASSWORD;
const SWITCH_IDENTITY_ID =
  process.env.ECONTACT_IDENTITY_ID || "0905466f-3d39-11f0-92f3-0607bbc2ee97";
const SWITCH_IDENTITY_NAME = process.env.ECONTACT_IDENTITY_NAME;

const LIST_ID = "64476587-1ddc-42e6-81ee-98fb46f81004";
const SCHEMA_ID = "d6a812ef-c2f5-4bc3-8571-eb2e77f1906f";
const WORK_ITEM_LIST_REFERER =
  'Wf.WorkItem.List.page?args=%7B%22schemaId%22%3A%22d6a812ef-c2f5-4bc3-8571-eb2e77f1906f%22%7D';

const execute = process.argv.includes("--execute");
const includeLeaveInBatch = process.argv.includes("--include-leave-in-batch");

if (!LOGIN_NAME || !PASSWORD) {
  console.error("Missing ECONTACT_USER or ECONTACT_PASSWORD environment variable.");
  process.exit(2);
}

const cookieJar = new Map();

function cookieHeader() {
  return [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(path, { method = "GET", body, pageCode, referer } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "text/plain;charset=UTF-8";
  if (pageCode) headers["Qs-PageCode"] = pageCode;
  if (referer) headers.Referer = new URL(referer, BASE_URL).toString();
  if (method === "POST") headers.Origin = new URL(BASE_URL).origin;
  if (cookieJar.size) headers.Cookie = cookieHeader();

  const response = await fetch(new URL(path, BASE_URL), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  for (const cookie of response.headers.getSetCookie?.() || []) {
    const match = cookie.match(/^([^=]+)=([^;]*)/);
    if (match) cookieJar.set(match[1], match[2]);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} failed: HTTP ${response.status} ${text.slice(0, 200)}`);
  }
  return text;
}

async function post(path, body, pageCode = "Wf.WorkItem.List", referer = WORK_ITEM_LIST_REFERER) {
  const text = await request(path, { method: "POST", body, pageCode, referer });
  const json = JSON.parse(text);
  if (json && json._failed) throw new Error(`${path} failed: ${json.message || text}`);
  return json;
}

async function login() {
  const keyResult = await post(
    "Qs.Misc.getLoginPublicKey.data",
    {},
    "Qs.OnlineUser.Login",
    "Qs.OnlineUser.Login.page"
  );
  const publicKey = keyResult.publicKey.match(/.{1,64}/g).join("\n");
  const pem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  const encryptedPassword = crypto
    .publicEncrypt(
      { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(PASSWORD)
    )
    .toString("base64");

  await post(
    "Qs.OnlineUser.login.data",
    {
      loginName: LOGIN_NAME,
      password: encryptedPassword,
      language: "zh-tw",
      extraArgs: null,
      checkRelogin: true,
    },
    "Qs.OnlineUser.Login",
    "Qs.OnlineUser.Login.page"
  );
}

async function getMainFrameClientData() {
  const html = await request("Qs.MainFrame.page");
  return extractClientData(html);
}

function formatIdentity(identity) {
  if (!identity) return "(unknown identity)";
  return `${identity.entityName || identity.name} | ${identity.departmentName || ""} | ${identity.id}`;
}

function findTargetIdentity(clientData) {
  const identities = clientData.identities || [];
  if (SWITCH_IDENTITY_ID) {
    return identities.find((identity) => identity.id === SWITCH_IDENTITY_ID) || null;
  }
  if (SWITCH_IDENTITY_NAME) {
    return (
      identities.find(
        (identity) =>
          identity.entityName === SWITCH_IDENTITY_NAME || identity.name === SWITCH_IDENTITY_NAME
      ) || null
    );
  }
  return null;
}

async function switchIdentityIfNeeded() {
  const clientData = await getMainFrameClientData();
  const currentIdentity = clientData.identity || null;
  const targetIdentity = findTargetIdentity(clientData);

  console.log(`目前身分：${formatIdentity(currentIdentity)}`);
  if (!targetIdentity) {
    if (!SWITCH_IDENTITY_ID && !SWITCH_IDENTITY_NAME) return;
    const available = (clientData.identities || []).map(formatIdentity).join("\n  ");
    throw new Error(
      `Configured identity was not found. Available identities:\n  ${available || "(none)"}`
    );
  }

  if (currentIdentity?.id === targetIdentity.id) {
    console.log(`已在目標身分：${formatIdentity(targetIdentity)}`);
    return;
  }

  console.log(`切換身分：${formatIdentity(targetIdentity)}`);
  await post(
    "Qs.OnlineUser.switchIdentity.data",
    { identityId: targetIdentity.id },
    "Qs.MainFrame",
    "Qs.MainFrame.page"
  );

  try {
    await post("Ecp.Aile.identitySwitch.data", {}, "Qs.MainFrame", "Qs.MainFrame.page");
  } catch (error) {
    console.warn(`Ecp.Aile.identitySwitch.data skipped: ${error.message}`);
  }

  const refreshed = await getMainFrameClientData();
  console.log(`切換後身分：${formatIdentity(refreshed.identity)}`);
}

async function listWorkItems() {
  const records = [];
  for (let pageIndex = 1; ; pageIndex++) {
    const body = {
      pageIndex,
      isRefresh: pageIndex === 1,
      listId: LIST_ID,
      schemaId: SCHEMA_ID,
      keyword: "",
    };
    const result = await post("qsvd-list/Wf.WorkItem.getListData.data", body);
    records.push(...(result.data.records || []));
    if (!result.data.hasNextPage) return records;
  }
}

function extractClientData(html) {
  const match = html.match(/var clientData = (\{[\s\S]*?\});\s*<\/script>/);
  if (!match) throw new Error("Unable to find clientData in page HTML.");
  return JSON.parse(match[1]);
}

async function getBatchPreview(workItemIds) {
  if (workItemIds.length === 0) return [];
  const { key } = await post("Qs.Misc.putLongUrlArguments.data", { workItemIds });
  const html = await request(`Wf.WorkItem.BatchPass.page?argsKey=${encodeURIComponent(key)}`);
  return extractClientData(html).items || [];
}

async function batchPass(workItemIds) {
  if (workItemIds.length === 0) return { items: [] };
  return post(
    "Wf.WorkItem.BatchPass.data",
    { workItemIds, comment: "" },
    "Wf.WorkItem.BatchPass",
    "Wf.WorkItem.BatchPass.page"
  );
}

async function getHandleInformation(workItemId) {
  return post("Wf.WorkItem.getHandleInformation.data", { workItemId, handleOnly: false });
}

async function getLeavePermitData(workItemId) {
  const info = await getHandleInformation(workItemId);
  if (info.args?.unitCode !== "Ecp.LeavePermit" || !info.args?.entityId) {
    throw new Error(`Work item ${workItemId} is not an Ecp.LeavePermit form.`);
  }

  const args = { ...info.args, addToLastOpen: false };
  const html = await request(
    `Ecp.LeavePermit.Form.page?args=${encodeURIComponent(JSON.stringify(args))}`
  );
  return extractClientData(html).editJson.data;
}

function isLeaveWorkflow(record) {
  return record["FWorkflowId$"] === "請(休)假單審核";
}

function normalizeDateTime(value) {
  return String(value || "").trim().replace("T", " ").slice(0, 16);
}

function leaveTimesMatch(data) {
  return (
    normalizeDateTime(data.F_StartDate) === normalizeDateTime(data.F_ActStartDate) &&
    normalizeDateTime(data.F_EndDate) === normalizeDateTime(data.F_ActEndDate)
  );
}

async function finishAgree(workItemId) {
  return post(
    "Wf.WorkItem.finish.data",
    { workItemId, result: "Agree", comment: "" },
    "Wf.WorkItem.Submit",
    "Wf.WorkItem.Submit.page"
  );
}

function summarize(record) {
  return `${record.FId} | ${record["FWorkflowId$"]} | ${record.FName} | ${record["FProcessId$"]}`;
}

async function main() {
  await login();
  await switchIdentityIfNeeded();
  const records = await listWorkItems();
  console.log(`登入成功，待辦 ${records.length} 筆。模式：${execute ? "EXECUTE" : "DRY-RUN"}`);

  const batchPreview = await getBatchPreview(records.map((record) => record.FId));
  const previewById = new Map(batchPreview.map((item) => [item.id, item]));
  const batchable = records.filter((record) => {
    const item = previewById.get(record.FId);
    if (!item || item.message) return false;
    return includeLeaveInBatch || !isLeaveWorkflow(record);
  });
  const notBatchable = records.filter((record) => !batchable.some((item) => item.FId === record.FId));

  console.log(`可批次審核 ${batchable.length} 筆。`);
  for (const record of batchable) console.log(`  BATCH ${summarize(record)}`);
  for (const record of notBatchable) {
    const message = previewById.get(record.FId)?.message || (isLeaveWorkflow(record) ? "留待逐筆比對" : "批次頁未列為可通過");
    console.log(`  SKIP-BATCH ${summarize(record)} | ${message}`);
  }

  if (batchable.length > 0) {
    if (execute) {
      const result = await batchPass(batchable.map((record) => record.FId));
      console.log(`批次審核回傳 ${result.items.length} 筆結果。`);
      for (const item of result.items) {
        console.log(`  ${item.success ? "OK" : "FAIL"} ${item.id} ${item.message || ""}`);
      }
    } else {
      console.log("DRY-RUN：未送出批次審核。");
    }
  }

  console.log("批次審核無可送出項目，開始檢查請(休)假單逐筆審核條件。");
  for (const record of records.filter(isLeaveWorkflow)) {
    const data = await getLeavePermitData(record.FId);
    const detail =
      `加班 ${normalizeDateTime(data.F_StartDate)}~${normalizeDateTime(data.F_EndDate)}, ` +
      `實際 ${normalizeDateTime(data.F_ActStartDate)}~${normalizeDateTime(data.F_ActEndDate)}`;
    if (!leaveTimesMatch(data)) {
      console.log(`  SKIP-LEAVE ${summarize(record)} | 時間不一致 | ${detail}`);
      continue;
    }
    if (execute) {
      const result = await finishAgree(record.FId);
      console.log(`  OK-LEAVE ${summarize(record)} | ${detail} | ${JSON.stringify(result)}`);
    } else {
      console.log(`  WOULD-AGREE-LEAVE ${summarize(record)} | ${detail}`);
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
