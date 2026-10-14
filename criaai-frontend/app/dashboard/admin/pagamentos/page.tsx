import { redirect } from 'next/navigation'

// O menu "Pagamentos (Hubla)" agora fica dentro do painel Admin. Links antigos vem para ca.
export default function PagamentosPage() {
  redirect('/dashboard/admin#pagamentos')
}
