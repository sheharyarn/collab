defmodule Collab.Document do
  use GenServer
  alias __MODULE__.Supervisor

  @initial_state %{
    contents: [],
    version: 0,
  }


  # Public API
  # ----------

  def start_link(id), do: GenServer.start_link(__MODULE__, :ok, name: {:global, {:doc, id}})
  def stop(id),       do: GenServer.stop({:global, {:doc, id}})

  def contents(id),       do: call(id, :contents)
  def update(id, change), do: call(id, {:update, change})

  defp call(id, data) do
    with {:ok, pid} <- open(id), do: GenServer.call(pid, data)
  end

  @doc "Create or open a document with a given id"
  def open(id) do
    case :global.whereis_name({:doc, id}) do
      pid when is_pid(pid) ->
        {:ok, pid}

      :undefined ->
        DynamicSupervisor.start_child(Supervisor, {__MODULE__, id})
    end
  end


  # Callbacks
  # ---------

  @impl true
  def init(:ok), do: {:ok, @initial_state}

  @impl true
  def handle_call(:contents, _from, state) do
    {:reply, state.contents, state}
  end

  @impl true
  def handle_call({:update, change}, _from, state) do
    contents = Delta.compose(state.contents, change)
    state = %{state | contents: contents, version: state.version + 1}

    {:reply, :ok, state}
  end
end
