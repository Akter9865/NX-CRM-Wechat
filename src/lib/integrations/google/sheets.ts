import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getValidAccessToken } from './client';

export interface SpreadsheetSummary {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  index: number;
}

export interface SpreadsheetDetails {
  spreadsheetId: string;
  title: string;
  sheets: SheetTabInfo[];
}

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-service-key'
  );
}

/**
 * Lists spreadsheets accessible to the user via Google Drive API.
 */
export async function listAccessibleSpreadsheets(
  accessToken: string
): Promise<SpreadsheetSummary[]> {
  try {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=30`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.warn('[GoogleSheets] Drive list error:', await res.text());
      return [];
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name || 'Untitled Spreadsheet',
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
    }));
  } catch (err) {
    console.warn('[GoogleSheets] Failed to list drive files:', err);
    return [];
  }
}

/**
 * Gets details of a specific spreadsheet including its sheet/tab names.
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetDetails> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title,index)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch spreadsheet details (Status: ${res.status})`);
  }

  const data = await res.json();
  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId ?? 0,
    title: s.properties?.title || 'Sheet1',
    index: s.properties?.index ?? 0,
  }));

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets,
  };
}

/**
 * Creates a brand-new "NX CRM - WhatsApp Leads" spreadsheet with formatted headers.
 */
export async function createDefaultLeadsSpreadsheet(
  accessToken: string,
  title: string = 'NX CRM - WhatsApp Leads'
): Promise<{ spreadsheetId: string; title: string; sheetName: string; spreadsheetUrl: string }> {
  const body = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'WhatsApp Leads',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: 'Contact Name' } },
                  { userEnteredValue: { stringValue: 'Phone Number' } },
                  { userEnteredValue: { stringValue: 'Email Address' } },
                  { userEnteredValue: { stringValue: 'Tags' } },
                  { userEnteredValue: { stringValue: 'Lead Stage' } },
                  { userEnteredValue: { stringValue: 'Source / Notes' } },
                  { userEnteredValue: { stringValue: 'Created At' } },
                  { userEnteredValue: { stringValue: 'Last Synced' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create new Google Spreadsheet');
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || title,
    sheetName: 'WhatsApp Leads',
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

/**
 * Appends a row of values to a target spreadsheet and tab.
 */
export async function appendRowToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowValues: (string | number | boolean | null)[]
): Promise<{ updatedRange: string; updatedRows: number }> {
  const targetRange = `${sheetName}!A:H`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(targetRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: targetRange,
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message || `Google Sheets API error (${res.status})`;
    throw new Error(msg);
  }

  return {
    updatedRange: data.updates?.updatedRange || '',
    updatedRows: data.updates?.updatedRows || 1,
  };
}

/**
 * End-to-end sync function for CRM Contacts & Leads.
 * Handles token resolution, spreadsheet initialization, row formatting, and updates last_synced_at.
 */
export async function syncContactToGoogleSheet(
  accountId: string,
  contact: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    stage?: string | null;
    tags?: string[] | string | null;
    notes?: string | null;
    created_at?: string | null;
  },
  options?: { source?: string }
): Promise<{
  success: boolean;
  message: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
  updatedRange?: string;
}> {
  const { accessToken, config } = await getValidAccessToken(accountId, 'google_sheets');

  let spreadsheetId = config.selected_spreadsheet_id;
  let sheetName = config.selected_sheet_name || 'WhatsApp Leads';
  let spreadsheetUrl = config.selected_spreadsheet_url || '';

  // If no spreadsheet is selected yet, create the default "NX CRM - WhatsApp Leads" spreadsheet automatically
  if (!spreadsheetId) {
    const created = await createDefaultLeadsSpreadsheet(accessToken);
    spreadsheetId = created.spreadsheetId;
    sheetName = created.sheetName;
    spreadsheetUrl = created.spreadsheetUrl;

    // Persist newly initialized spreadsheet in config
    const updatedConfig = {
      ...config,
      selected_spreadsheet_id: spreadsheetId,
      selected_spreadsheet_title: created.title,
      selected_sheet_name: sheetName,
      selected_spreadsheet_url: spreadsheetUrl,
    };

    await supabaseAdmin()
      .from('account_integrations')
      .update({
        config: updatedConfig,
        external_resource_id: spreadsheetId,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .eq('integration_id', 'google_sheets');
  }

  // Format tags
  const tagsFormatted = Array.isArray(contact.tags)
    ? contact.tags.join(', ')
    : typeof contact.tags === 'string'
    ? contact.tags
    : '';

  const timestamp = new Date().toISOString();
  const createdDate = contact.created_at
    ? new Date(contact.created_at).toLocaleString()
    : new Date().toLocaleString();

  const row = [
    contact.name || 'Anonymous Lead',
    contact.phone || '',
    contact.email || '',
    tagsFormatted,
    contact.stage || 'Lead',
    options?.source || contact.notes || 'NX CRM WhatsApp Inbox',
    createdDate,
    new Date(timestamp).toLocaleString(),
  ];

  const result = await appendRowToSpreadsheet(accessToken, spreadsheetId, sheetName, row);

  // Update last_synced_at and clear any previous error
  await supabaseAdmin()
    .from('account_integrations')
    .update({
      last_synced_at: timestamp,
      last_error: null,
      updated_at: timestamp,
    })
    .eq('account_id', accountId)
    .eq('integration_id', 'google_sheets');

  return {
    success: true,
    message: `Contact "${contact.name || contact.phone}" synced to Google Sheets!`,
    spreadsheetId,
    spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetName,
    updatedRange: result.updatedRange,
  };
}
