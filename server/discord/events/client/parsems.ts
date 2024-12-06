export function parseMs(tempoEmMs: number): string {
    const umSegundo = 1000;
    const umMinuto = 60 * umSegundo;
    const umaHora = 60 * umMinuto;
    const umDia = 24 * umaHora;

    const dias = Math.floor(tempoEmMs / umDia);
    tempoEmMs %= umDia;

    const horas = Math.floor(tempoEmMs / umaHora);
    tempoEmMs %= umaHora;

    const minutos = Math.floor(tempoEmMs / umMinuto);
    tempoEmMs %= umMinuto;

    const segundos = Math.floor(tempoEmMs / umSegundo);

    let resultado = '';
    if (dias > 0) resultado += `${dias}d `;
    if (horas > 0) resultado += `${horas}h `;
    if (minutos > 0) resultado += `${minutos}m `;
    if (segundos > 0) resultado += `${segundos}s`;

    return resultado.trim();
}
