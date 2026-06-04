interface TemplateParams {
  cliente?: string;
  fecha?: string;
  hora?: string;
  servicio?: string;
  horarios?: string;
}

export function fillTemplate(template: string, params: TemplateParams): string {
  let text = template;
  if (params.cliente) text = text.replace(/{cliente}/g, params.cliente);
  if (params.fecha) text = text.replace(/{fecha}/g, params.fecha);
  if (params.hora) text = text.replace(/{hora}/g, params.hora);
  if (params.servicio) text = text.replace(/{servicio}/g, params.servicio);
  if (params.horarios) text = text.replace(/{horarios}/g, params.horarios);
  return text;
}

export function getWhatsAppLink(phone: string, text: string): string {
  // Clear any non-numeric characters from the phone except a potentially leading +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  // If it doesn't have a country code, prefix with 52 (Mexico) by default
  let finalPhone = cleanPhone;
  if (cleanPhone.length === 10) {
    finalPhone = `52${cleanPhone}`;
  }
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodedText}`;
}
