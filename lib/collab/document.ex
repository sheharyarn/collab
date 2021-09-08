defmodule Collab.Document do
  use GenServer
  alias __MODULE__.Supervisor


  @initial_state %{contents: ""}


  # Public API
  # ----------

  def start_link(id), do: GenServer.start_link(__MODULE__, :ok, name: name(id))
  def stop(id),       do: GenServer.stop(name(id))

  def get_contents(id),   do: call(id, :get_contents)
  def update(id, change), do: call(id, {:update, change})

  def open(id) do
    case GenServer.whereis(name(id)) do
      nil -> DynamicSupervisor.start_child(Supervisor, {__MODULE__, id})
      pid -> {:ok, pid}
    end
  end


  # Callbacks
  # ---------

  @impl true
  def init(:ok), do: {:ok, @initial_state}

  @impl true
  def handle_call(:get_contents, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_call({:update, contents}, _from, _state) do
    state = %{contents: contents}
    {:reply, state, state}
  end


  # Private Helpers
  # ---------------

  defp call(id, data) do
    with {:ok, pid} <- open(id), do: GenServer.call(pid, data)
  end

  defp name(id), do: {:global, {:doc, id}}
end
