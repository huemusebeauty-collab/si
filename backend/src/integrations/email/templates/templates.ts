import { renderTemplate } from "./template.engine";

// Sprint 5.4 — the 5 required transactional templates. Plain-text +
// minimal HTML wrapper, consistent with Sprint 1's brand tokens (Plum/
// Rose) at the level appropriate for a foundation-stage template set —
// full branded HTML email design is a Sprint 6+/content-production
// concern, not this sprint's.

function wrap(bodyHtml: string): string {
  return `<div style="font-family: sans-serif; color: #231F20; max-width: 480px; margin: 0 auto;">
    <h1 style="color: #6B2247; font-size: 20px;">Hue Muse Beauty</h1>
    ${bodyHtml}
    <p style="color: #6E6660; font-size: 12px; margin-top: 32px;">Hue Muse Beauty — this is an automated message.</p>
  </div>`;
}

export const EMAIL_TEMPLATES = {
  welcome: (vars: { firstName: string }) => ({
    subject: "Welcome to Hue Muse Beauty",
    html: wrap(renderTemplate("<p>Hi {{firstName}}, welcome to Hue Muse Beauty! We're glad you're here.</p>", vars)),
    text: renderTemplate("Hi {{firstName}}, welcome to Hue Muse Beauty!", vars),
  }),
  orderConfirmation: (vars: { firstName: string; orderId: string; total: string }) => ({
    subject: `Your Hue Muse Beauty order #{{orderId}} is confirmed`.replace("{{orderId}}", vars.orderId),
    html: wrap(
      renderTemplate(
        "<p>Hi {{firstName}}, your order #{{orderId}} for {{total}} has been confirmed.</p>",
        vars,
      ),
    ),
    text: renderTemplate("Hi {{firstName}}, your order #{{orderId}} for {{total}} has been confirmed.", vars),
  }),
  passwordReset: (vars: { firstName: string; resetLink: string }) => ({
    subject: "Reset your Hue Muse Beauty password",
    html: wrap(
      renderTemplate(
        '<p>Hi {{firstName}}, click <a href="{{resetLink}}">here</a> to reset your password. This link expires in 1 hour.</p>',
        vars,
      ),
    ),
    text: renderTemplate("Hi {{firstName}}, reset your password: {{resetLink}} (expires in 1 hour)", vars),
  }),
  shipmentNotification: (vars: { firstName: string; orderId: string; trackingNumber: string }) => ({
    subject: `Your order #{{orderId}} has shipped`.replace("{{orderId}}", vars.orderId),
    html: wrap(
      renderTemplate(
        "<p>Hi {{firstName}}, your order #{{orderId}} has shipped. Tracking number: {{trackingNumber}}.</p>",
        vars,
      ),
    ),
    text: renderTemplate("Hi {{firstName}}, order #{{orderId}} shipped. Tracking: {{trackingNumber}}", vars),
  }),
  refundNotification: (vars: { firstName: string; orderId: string; amount: string }) => ({
    subject: `Your refund for order #{{orderId}} has been processed`.replace("{{orderId}}", vars.orderId),
    html: wrap(
      renderTemplate(
        "<p>Hi {{firstName}}, a refund of {{amount}} for order #{{orderId}} has been processed.</p>",
        vars,
      ),
    ),
    text: renderTemplate("Hi {{firstName}}, refund of {{amount}} for order #{{orderId}} processed.", vars),
  }),
};
