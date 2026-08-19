import * as XLSX from 'xlsx';
import type { Contact, Tag } from '@/types';
import { format } from 'date-fns';

export interface ContactWithTagsExport extends Contact {
  tags?: Tag[];
  contact_tags?: Array<{ tag_id?: string }>;
}

export interface ContactExportRow {
  Name: string;
  Phone: string;
  Email: string;
  Company: string;
  Tags: string;
  'Created At': string;
  'Updated At': string;
}

/**
 * Format contacts array into normalized objects ready for CSV/XLSX export.
 */
export function formatContactsForExport(
  contacts: ContactWithTagsExport[],
  tagsMap?: Record<string, Tag>,
): ContactExportRow[] {
  return contacts.map((c) => {
    let tagNames = '';
    if (Array.isArray(c.tags) && c.tags.length > 0) {
      tagNames = c.tags.map((t) => t.name).join(', ');
    } else if (tagsMap && Array.isArray(c.contact_tags)) {
      tagNames = c.contact_tags
        .map((ct) => ct.tag_id && tagsMap[ct.tag_id]?.name)
        .filter(Boolean)
        .join(', ');
    }

    return {
      Name: c.name || '',
      Phone: c.phone || '',
      Email: c.email || '',
      Company: c.company || '',
      Tags: tagNames,
      'Created At': c.created_at ? format(new Date(c.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
      'Updated At': c.updated_at ? format(new Date(c.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
    };
  });
}

/**
 * Export contacts list to CSV or XLSX and trigger browser download.
 */
export function exportContactsToFile(
  contacts: ContactWithTagsExport[],
  formatType: 'csv' | 'xlsx',
  tagsMap?: Record<string, Tag>,
  customFilename?: string,
) {
  const rows = formatContactsForExport(contacts, tagsMap);
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = customFilename || `contacts_export_${dateStr}.${formatType}`;

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Name', 'Phone', 'Email', 'Company', 'Tags', 'Created At', 'Updated At'],
  });

  // Auto-fit column widths
  const colWidths = [
    { wch: 22 }, // Name
    { wch: 18 }, // Phone
    { wch: 26 }, // Email
    { wch: 20 }, // Company
    { wch: 24 }, // Tags
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

  if (formatType === 'csv') {
    // Generate CSV string with UTF-8 BOM so Excel opens accents & symbols cleanly
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Generate XLSX binary and trigger download
    XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
  }
}
