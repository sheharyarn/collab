defmodule CollabWeb.DocChannel do
  use CollabWeb, :channel
  alias Collab.Document

  @impl true
  def join("doc:" <> id, _payload, socket) do
    {:ok, _pid} = Document.open(id)
    socket = assign(socket, :id, id)
    send(self(), :after_join)

    {:ok, socket}
  end

  @impl true
  def handle_in("update", %{"change" => change} = payload, socket) do
    case Document.update(socket.assigns.id, change) do
      :ok ->
        broadcast_from!(socket, "update", payload)
        {:noreply, socket}

      _error ->
        {:reply, {:error, "Something went wrong"}, socket}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    contents = Document.contents(socket.assigns.id)
    push(socket, "open", %{contents: contents})

    {:noreply, socket}
  end
end
