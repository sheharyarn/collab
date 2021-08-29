defmodule Collab.Application do
  use Application

  def start(_type, _args) do
    children = [
      Collab.Document.Supervisor,
      {Phoenix.PubSub, name: Collab.PubSub},
      CollabWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: Collab.Supervisor]
    Supervisor.start_link(children, opts)
  end

  def config_change(changed, _new, removed) do
    CollabWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
