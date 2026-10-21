export function selectionGuidance(min: number, max: number, step: number, required: boolean): string {
  const rule = min === max ? `${required ? 'Escolha' : 'Opcional. Se escolher, selecione'} exatamente ${min} ${min===1?'unidade':'unidades'}.` : required ? `Escolha de ${Math.max(1,min)} a ${max} unidades.` : min > 0 ? `Opcional. Se escolher, selecione de ${min} a ${max} unidades.` : `Opcional. Escolha até ${max} ${max===1?'unidade':'unidades'}.`;
  return `${rule}${step > 1 ? ` Adicione de ${step} em ${step}.` : ''} Limites por unidade do produto.`;
}
export function missingSelections(min: number, current: number): number { return Math.max(0, min-current); }
