# Holonym / Human.wallet / Silk-Auth

Basic striped webapp that uses silk (https://docs.wallet.human.tech/docs/intro)
in a nextjs / next-auth application. It features some patterns that go beyond
the basic hello-world app including:

- api/ uses a try/catch that does a generic handleError and response for the
  output. It also uses next-auth to receive the session from a jwt-token
- page.tsx uses a auth-context to determine if the session is set by next-auth
  or if the login-provider is still loading
- auth-config that allows additional providers to be added
- web3-abstraction that wraps (opinionated) features of wagmi,viem & co in
  order to keep the actual web3-implementation out of the components
- basic prisma db for user-storage and docker-compose to quickly spin up a
  dev-environment

# implementation details

In order for the silk-wallet to work there are multiple pieces at play:

1. Every page needs to initialize silk.
   Silk has the feature to 'auto-connect' (https://docs.wallet.human.tech/docs/guides/methods#auto-connect-functionality)
   which assumes that `window.silk` is available. In order to have that, `initSilk(...)` has
   to be called on every page navigation. In this implementation this is done in the
   `context-provider.tsx`, this ensures it is only called once. The alternative approach is
   using a `useEffect` which gives you the control to _not_ load it at certain pages.
   See
2. initialize takes time, there is no native way to get a ready state
   when the context renders, it might be before window.silk is available. therefore a check-loop
   is installed and a flag is exposed, rely on 'ready' in components as it checks more web3-values.

# usage

```
host> cp env.template .env
host> cp env.local.template .env.local
... review the contents...
host> docker compose run --rm app-shell
sa-app> pnpm install
sa-app> pnpx auth
sa-app> pnpm dev:db
sa-app> pnpm lint
sa-app> pnpm pnpm chown
....
host > docker compose up app
... view app logs
host > docker compose --profile develop up pgadmin
... connect to database
```

expose the app-modules to node_modules
(useful for code-editors that willingly execute scripts in there)

```
root@host > mount -o bind dev_modules/app/node_modules ./node_modules
```

of course the 'traditional' way is also possible, just
`pnpm install && pnpm dev` on the host

make sure to adapt the .env.local appropriately. the app will host on localhost:3000,
but the example NEXTAUTH_URL is http://localhost:1010 (as remapped by docker-compose)
You'll also have to set the DATABASE_URL to a locally running postgres

# warning

- the configuration of the silk + siwe login was done with little
  documentation and on a possibly wrong assumption how to use it.
- the current implementation still uses wagmi config but does not initialize
  a wagmiProvider. therfore wagmi is not usable in the application. use ethers.
- this is a stripped application, based on https://github.com/Akashic-fund/akashic/
  some styles, animations, words may be leftover
