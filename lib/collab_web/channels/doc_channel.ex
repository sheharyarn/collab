defmodule CollabWeb.DocChannel do
  use CollabWeb, :channel
  alias Collab.Document
  require Logger

  @impl true
  def join("doc:" <> id, _payload, socket) do
    {:ok, _pid} = Document.open(id)
    socket = assign(socket, :id, id)
    send(self(), :after_join)

    {:ok, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    response = Document.get_contents(socket.assigns.id)
    push(socket, "open", response)

    {:noreply, socket}
  end

  @impl true
  def handle_in("update", %{"change" => change, "version" => version}, socket) do
    case Document.update(socket.assigns.id, change, version) do
      {:ok, response} ->
        Process.sleep(1000)
        broadcast_from!(socket, "update", response)
        {:reply, :ok, socket}

      error ->
        Logger.error(inspect(error))
        {:reply, {:error, inspect(error)}, socket}
    end
  end
end
