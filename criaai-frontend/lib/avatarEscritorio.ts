// A Camila: imagens da MESMA mulher (boca fechada, meio aberta, aberta, redonda 'o/u', larga 'e/i' e olhos fechados).
// A tela troca de imagem no ritmo da voz e pisca de vez em quando. As imagens ficam no armazenamento (bucket page-images).
export const QUADROS = ['base', 'meia', 'aberta', 'redonda', 'larga', 'piscando'] as const
export type Quadro = typeof QUADROS[number]
export const PASTA_AVATAR = 'avatar-escritorio/camila'

export const PROMPT_BASE = 'Fotografia realista, retrato profissional de uma mulher brasileira de cerca de 32 anos (uma pessoa ficticia, que nao existe), cabelo castanho escuro liso na altura dos ombros, olhos castanhos, pele natural com textura real, sorriso simpatico e confiante, vestida de forma social: blazer azul-marinho bem cortado sobre blusa branca, discreta e elegante. Sentada em um escritorio moderno e iluminado, com leve luz roxa suave ao fundo desfocado, olhando direto para a camera. Enquadramento do busto para cima, centralizada, lente 85mm, profundidade de campo rasa, luz de estudio suave, qualidade de foto de revista. Boca fechada em um sorriso suave e olhos abertos. Formato retrato vertical. Sem texto, sem marca dagua, sem logotipos.'

const IGUAL = 'Esta e a mesma personagem, no mesmo cenario, como na mesma fotografia, com exatamente a mesma roupa, cabelo, enquadramento, posicao, iluminacao e cores. Nao mude absolutamente nada alem do que esta descrito abaixo. '
export const PROMPT_VARIACAO: Record<string, string> = {
  meia: IGUAL + 'Altere somente a boca: deixe-a levemente entreaberta, como quem esta falando, mostrando um pouco dos dentes, de forma natural e realista.',
  aberta: IGUAL + 'Altere somente a boca: deixe-a bem aberta, como quem fala em voz alta (som de a), mostrando os dentes, de forma natural e realista.',
  redonda: IGUAL + 'Altere somente a boca: deixe-a pequena e arredondada, com os labios projetados para frente, como quem fala a letra O ou U. Sem mostrar os dentes.',
  larga: IGUAL + 'Altere somente a boca: deixe-a larga e esticada para os lados, como quem fala a letra E ou I, mostrando os dentes de cima e de baixo, entreaberta, de forma natural e realista.',
  piscando: IGUAL + 'Altere somente os olhos: deixe os dois olhos completamente fechados, como em um piscar. A boca continua como esta.',
}
