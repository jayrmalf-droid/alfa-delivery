# Verificação técnica — AlfaDelivery PRO 0.6.4 PRÉVIA

Data: 14/10/2026. Base: ZIP da versão 0.6.3 aprovado pelo proprietário. Status: PRÉVIA; testes funcionais 1 a 9 aprovados pelo proprietário no Windows; teste 10 pendente após esta correção.

## Resultados

| Verificação | Resultado |
|---|---|
| Instalação com npm ci | Aprovada, inclusive em extração temporária do ZIP |
| npm audit | 0 vulnerabilidades reportadas |
| npm test | 49 testes, 49 aprovados, sem testes ignorados |
| npm run build | TypeScript e Vite concluídos sem erros |
| npm run lint | Código de saída 0; avisos de manutenção permanecem |
| npm start | Verificado com SQLite temporário: saúde, página da loja, página /admin e JavaScript compilado responderam HTTP 200 |
| Empacotamento e extração | Arquivos obrigatórios, versão, seed sem dados operacionais e exclusões conferidos |
| npm run verify:release | Instalação, 49 testes e compilação aprovados no pacote extraído |
| Banco existente | Nenhuma mudança de esquema; teste confirma que preparar os seeds não altera o SQLite local |

## Confirmação de formulários

Uma verificação adicional dos componentes React, com resposta de servidor simulada e atrasada, aprovou sete fluxos: categorias, configurações, cadastro de clientes, sabores, despesas, metas e venda rápida.

Foram verificados controles bloqueados enquanto o envio está pendente, rascunho preservado na resposta de falha e limpeza/fechamento ou mensagem de sucesso somente após resposta de confirmação. A verificação da venda usa cliente já cadastrado para exercitar diretamente a falha da própria venda.

Esta verificação foi feita em um ambiente temporário de testes de componentes. Não acrescentou dependências ao aplicativo. Não equivale a uma verificação visual no navegador.

## Cobertura relevante dos testes automáticos

- Retorno de promessas das gravações; falhas propagadas; fila recuperável; cancelamento das gravações dependentes após conflito.
- Sem rede, o cache restaura os dados confirmados, em vez de apresentar o rascunho como persistido.
- Ganho, resgate e cancelamento de pontos pela API, com estornos sem duplicidade.
- Backups do terminal e do painel, nomes antigos, listagem, download e integridade.
- Dados operacionais de um SQLite local de teste não entram no seed de compilação.
- Validação dos dois arquivos src/data e rejeição das pastas/arquivos proibidos.
- Porta ocupada mantém o servidor anterior funcionando.
- Testes existentes de catálogo, personalização, estoque, pedidos, pagamento, rastreio privado e impressão foram preservados, exceto os quatro testes unitários da antiga regra de selos substituídos pela cobertura atual de pontos.

## Limites e observações

- Os testes foram executados em Linux com Node.js 24.19.0. Windows, impressão física, layout visual e interação no navegador precisam da homologação do proprietário.
- A tentativa de disponibilizar o navegador automatizado foi bloqueada por falha no download do executável neste ambiente. Nenhum teste visual foi declarado aprovado.
- O Vite mantém um aviso de arquivo JavaScript principal maior que 500 kB. Divisão adicional de código ficou fora deste escopo.
- Os avisos de lint não impedem a compilação; uma limpeza ampla de componentes antigos ficou fora deste escopo.
- Uma falha de conexão após o servidor gravar pode deixar a confirmação incerta. Confira o histórico antes de reenviar uma venda ou recebimento; não há reenvio automático.
- O cadastro rápido do cliente e a venda continuam sendo operações separadas. Se a venda falhar depois do cadastro, o cliente pode permanecer salvo; o formulário da venda é preservado.

Siga TESTES_WINDOWS_0.6.4.md. Nenhum resultado aqui promove a 0.6.4 a estável.

## Correção de compatibilidade do ZIP no Windows

O proprietário encontrou uma rejeição dos caminhos produzidos pelo PowerShell/.NET, que usavam barras invertidas. A verificação normalizava esses separadores, mas depois rejeitava a entrada original. A correção valida o caminho normalizado e continua bloqueando caminhos absolutos, subida de diretório, arquivos de outros projetos e dados operacionais. Um novo teste cobre os dois separadores e as rejeições. A suíte passa a ter 49 testes.

A correção altera somente scripts/release-utils.mjs e acrescenta cobertura em tests/release-and-startup.test.mjs, além da documentação. Não altera os fluxos já aprovados nos testes 1 a 9. A execução real de release e verify:release no Windows precisa ser repetida pelo proprietário.
