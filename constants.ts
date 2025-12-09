export const SUPPORTED_EXTENSIONS = [
  '.txt', '.md', '.json', '.csv', 
  '.js', '.jsx', '.ts', '.tsx', '.py', 
  '.html', '.css', '.xml', '.sql',
  '.pdf'
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file for browser performance

export const MIME_TYPE_MAP: Record<string, string> = {
  'txt': 'text/plain',
  'md': 'text/markdown',
  'json': 'application/json',
  'csv': 'text/csv',
  'js': 'text/javascript',
  'jsx': 'text/javascript',
  'ts': 'text/javascript',
  'tsx': 'text/javascript',
  'py': 'text/x-python',
  'html': 'text/html',
  'css': 'text/css',
  'xml': 'text/xml',
  'sql': 'application/x-sql',
  'pdf': 'application/pdf'
};

export const SYSTEM_PROMPT_TEMPLATE = `
You are an advanced file analysis assistant named "FileInsight". 
Your goal is to answer user questions based strictly on the provided documents.

INSTRUCTIONS:
1.  Analyze the provided files carefully.
2.  Answer the user's questions based ONLY on these documents.
3.  If the answer is not in the documents, state that clearly.
4.  Cite the filename when referencing specific information.
5.  Format your response using clear Markdown.
`;