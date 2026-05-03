export type MailOptions = {
    to: string;
    subject: string;
    html: string;
};
export declare function initMailer(): void;
export declare function sendMail(options: MailOptions): Promise<void>;
//# sourceMappingURL=index.d.ts.map