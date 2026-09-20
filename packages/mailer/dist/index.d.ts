export type MailOptions = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};
export declare function initMailer(): void;
export declare function htmlToText(html: string): string;
export declare function sendMail(options: MailOptions): Promise<void>;
export declare function renderEmail(params: {
    title: string;
    paragraphs?: string[];
    rawHtml?: string;
    action?: {
        label: string;
        url: string;
    };
    footer?: string;
}): string;
//# sourceMappingURL=index.d.ts.map