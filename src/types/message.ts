// Single, authoritative Message interface that matches the clean database schema
export interface Message {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  encrypted_content: string;
  message_type: 'text' | 'system';
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
  // Computed field (not in database)
  is_own_message?: boolean;
}

// Database row type (exact match to database schema)
export interface MessageRow {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  encrypted_content: string;
  message_type: 'text' | 'system';
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to convert database row to application message
export const mapMessageRowToMessage = (row: MessageRow, currentUserId: string): Message => ({
  ...row,
  is_own_message: row.sender_id === currentUserId,
});

// Helper function to convert application message to database row
export const mapMessageToRow = (message: Message): MessageRow => ({
  id: message.id,
  session_id: message.session_id,
  sender_id: message.sender_id,
  content: message.content,
  encrypted_content: message.encrypted_content,
  message_type: message.message_type,
  is_flagged: message.is_flagged,
  created_at: message.created_at,
  updated_at: message.updated_at,
});
