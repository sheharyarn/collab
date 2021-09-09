import Config

# Env helper
defmodule Conf do
  def env!(var, convert \\ & &1) do
    val = System.get_env(var) || raise("ENV variable #{inspect(var)} not set!")
    convert.(val)
  end
end


if config_env() == :prod do
  host       = Conf.env!("HOST")
  secret_key = Conf.env!("SECRET_KEY_BASE")
  port       = Conf.env!("PORT", &String.to_integer/1)


  config :collab, CollabWeb.Endpoint,
    server: true,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      port: port,
      transport_options: [socket_opts: [:inet6]]
    ],
    secret_key_base: secret_key
end
