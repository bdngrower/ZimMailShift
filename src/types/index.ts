export type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface MigrationTask {
    id: string;
    user_id: string;
    source_email: string;
    destination_email: string;
    filter_date: string;
    status: MigrationStatus;
    total_emails: number;
    processed_emails: number;
    created_at: string;
}

export interface MigrationLog {
    id: string;
    task_id: string;
    email_subject: string;
    status: 'success' | 'error';
    error_message?: string;
    processed_at: string;
}
