# Gera o papel de parede do chat do Suporte (desenhos em linha, no estilo do WhatsApp).
# Uso: python scripts/papel-chat.py  -> public/chat/papel-claro.svg e papel-escuro.svg
import random, os
random.seed(7)
ICONES = [
  'M12 21s-7-4.4-9.3-9C1 8.5 3 5 6.3 5 8.4 5 10.5 6.2 12 8.3 13.5 6.2 15.6 5 17.7 5 21 5 23 8.5 21.3 12c-2.3 4.6-9.3 9-9.3 9z',  # coracao
  'M12 3v18M6 9h12',  # cruz
  'M12 2l3 7 7 .5-5 5 1.5 7.5L12 18l-6.5 4L7 14.5l-5-5L9 9z',  # estrela
  'M3 5h18v11H10l-5 4v-4H3z',  # balao
  'M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14',  # livro
  'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM8 14c1.2 2 6.8 2 8 0M9 9.5v.5M15 9.5v.5',  # carinha
  'M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19L14 10',  # folha
  'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',  # sol
  'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',  # celular
  'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',  # musica
  'M3 7h18v13H3zM8 7V4h8v3',  # maleta
  'M4 4h16v12H4zM8 20h8M12 16v4',  # computador
  'M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2zM9 21h6',  # lampada
  'M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z',  # globo
  'M6 3h12l4 6-10 12L2 9z',  # diamante
  'M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z',  # carteira
  'M3 3v18h18M7 14l4-4 4 4 5-6',  # grafico
  'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zM18 16V11a6 6 0 1 0-12 0v5l-2 2h16z',  # sino
  'M23 7l-7 5 7 5zM1 5h15v14H1z',  # camera
  'M9 12l2 2 4-4M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z',  # check
  'M12 2l2.4 4.8L20 8l-4 4 1 5.6L12 15l-5 2.6L8 12 4 8l5.6-1.2z',  # selo
  'M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 1v3M10 1v3M14 1v3',  # cafe
  'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',  # ajustes
  'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',  # mensagem
]
def tile(cor, opac):
    W = H = 420
    partes = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" fill="none" stroke="%s" stroke-opacity="%s" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' % (W, H, W, H, cor, opac)]
    passo = 70
    i = 0
    for gy in range(0, H, passo):
        for gx in range(0, W, passo):
            x = gx + random.randint(6, 26) + (35 if (gy // passo) % 2 else 0)
            y = gy + random.randint(6, 26)
            x %= W
            esc = random.choice([1.05, 1.2, 1.3, 1.4])
            rot = random.randint(-25, 25)
            d = ICONES[i % len(ICONES)]; i += 1
            for dx in (0, -W):
                for dy in (0, -H):
                    if (dx and x < W - 40) or (dy and y < H - 40):
                        continue
                    partes.append('<g transform="translate(%d,%d) rotate(%d 12 12) scale(%.2f)"><path d="%s"/></g>' % (x + dx, y + dy, rot, esc, d))
    partes.append('</svg>')
    return ''.join(partes)
os.makedirs('public/chat', exist_ok=True)
open('public/chat/papel-claro.svg', 'w').write(tile('#a0947c', '0.30'))
open('public/chat/papel-escuro.svg', 'w').write(tile('#ffffff', '0.06'))
print('ok')
