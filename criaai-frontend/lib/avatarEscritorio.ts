// A Camila no escritorio: 4 imagens da MESMA personagem (boca fechada, meio aberta, aberta e olhos fechados).
// A tela troca de imagem no ritmo da voz e pisca de vez em quando. As imagens ficam no armazenamento (bucket page-images).
export const QUADROS = ['base', 'meia', 'aberta', 'piscando'] as const
export type Quadro = typeof QUADROS[number]
export const PASTA_AVATAR = 'avatar-escritorio/camila'

export const PROMPT_BASE = 'Ilustracao digital no estilo de personagem de animacao 3D moderna, semi-realista, de uma assistente de escritorio virtual: mulher brasileira de cerca de 30 anos, cabelo castanho escuro liso na altura dos ombros, olhos castanhos, sorriso simpatico e acolhedor, blazer azul-marinho sobre blusa branca, sentada a uma mesa de trabalho olhando para a camera, enquadramento do busto para cima, centralizada. Cenario: escritorio moderno e futurista com luzes de neon roxo e rosa, estantes ao fundo e um letreiro grande com as letras IA brilhando em neon atras dela. Boca fechada em um sorriso suave e olhos abertos. Formato retrato vertical. Sem nenhum outro texto e sem marca dagua. Personagem totalmente original.'

const IGUAL = 'Esta e a mesma personagem, no mesmo cenario, com exatamente a mesma roupa, cabelo, enquadramento, posicao, iluminacao e cores. Nao mude absolutamente nada alem do que esta descrito abaixo. '
export const PROMPT_VARIACAO: Record<string, string> = {
  meia: IGUAL + 'Altere somente a boca: deixe-a levemente entreaberta, como quem esta falando, mostrando um pouco dos dentes.',
  aberta: IGUAL + 'Altere somente a boca: deixe-a bem aberta, como quem fala em voz alta (som de a), mostrando os dentes e um pouco da lingua.',
  piscando: IGUAL + 'Altere somente os olhos: deixe os dois olhos completamente fechados, como em um piscar. A boca continua como esta.',
}
