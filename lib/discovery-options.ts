export const genderOptions = { woman: 'Mulher', man: 'Homem', non_binary: 'Pessoa não binária', other: 'Outra identidade' };
export type Gender = keyof typeof genderOptions;
export const distanceOptions = [10, 30, 50, 100, 200];
// Quantize before sending: precise device coordinates never leave the browser.
export function approximateLocation(latitude:number,longitude:number){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new Error('Localização inválida.');
 return {latitude:Math.round(latitude*20)/20,longitude:Math.round(longitude*20)/20};
}
