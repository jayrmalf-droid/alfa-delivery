import net from 'node:net';

export async function assertPortAvailable(port, host = '0.0.0.0') {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT deve ser um número inteiro entre 0 e 65535.');
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', error => reject(new Error(error.code === 'EADDRINUSE'
      ? `A porta ${port} já está em uso. Feche a instância anterior pelo terminal dela ou configure outra PORT no arquivo .env. Nenhum processo foi encerrado.`
      : `Não foi possível usar a porta ${port}: ${error.message}`)));
    probe.listen({ port, host, exclusive: true }, () => probe.close(error => error ? reject(error) : resolve()));
  });
}
