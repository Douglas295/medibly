# Power BI Integration with Next.js

This guide explains how to set up and integrate a Power BI `.pbix` file into your Next.js project using Power BI Service and Azure AD for authentication.

---

## ✅ Step 1: Publish `.pbix` to Power BI Service

1. Open your `.pbix` file using **Power BI Desktop**.
2. Sign in with your **Power BI Pro** or **Premium** account.
3. Click on **File → Publish → Publish to Power BI**.
4. Choose or create a **workspace** to publish the report.

> After publishing, go to [Power BI Service](https://app.powerbi.com/) to access your report and dataset.

---

## ✅ Step 2: Collect Required Power BI IDs

Go to the workspace in Power BI Service and gather the following:

### 🔹 PBI_WORKSPACE_ID
- Find in the URL when viewing your workspace:
https://app.powerbi.com/groups/<workspace-id>/list

### 🔹 PBI_REPORT_ID
- Click the report and copy from the URL:
https://app.powerbi.com/groups/<workspace-id>/reports/<report-id>/ReportSection

### 🔹 PBI_DATASET_ID
- Go to **Datasets + Dataflows** tab in the workspace.
- Click the dataset to inspect the URL or use the Power BI REST API to list datasets.

---

## ✅ Step 3: Register Azure AD Application

Go to [Azure Portal](https://portal.azure.com):

1. Navigate to **Azure Active Directory > App registrations**.
2. Click **New registration**.
3. Name: `PowerBIEmbedApp`
4. Redirect URI: `http://localhost:3000` (or your frontend URI)
5. Click **Register**.

You’ll receive:

| Variable         | Source                   |
|------------------|--------------------------|
| `AZURE_CLIENT_ID`   | App Overview page        |
| `AZURE_TENANT_ID`   | App Overview page        |

Then:

6. Go to **Certificates & secrets** → Click **New client secret**.
7. Copy the generated **value** (this is `AZURE_CLIENT_SECRET`).

---

## ✅ Step 4: Configure API Permissions

1. Go to **API permissions** inside your registered app.
2. Click **Add a permission**.
3. Choose **Power BI Service** > **Delegated permissions**.
4. Select:
 - `Dataset.Read.All`
 - `Report.Read.All`
 - `Workspace.Read.All`
5. Click **Grant admin consent**.

---

## ✅ Step 5: Enable Service Principal in Power BI

> ⚠️ You need Power BI Admin privileges for this step.

1. Go to [Power BI Admin Portal](https://app.powerbi.com/admin-portal).
2. Under **Tenant settings**, find and enable:
 - `Allow service principals to use Power BI APIs`
3. Go to your **workspace** → **Settings → Access**.
4. Add your Azure AD app as a **member** or **admin** to grant access.

---

Once these steps are completed, set your environment variables in your `.env` file:

```bash
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
PBI_WORKSPACE_ID=your-workspace-id
PBI_REPORT_ID=your-report-id
PBI_DATASET_ID=your-dataset-id

