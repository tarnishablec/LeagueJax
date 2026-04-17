use maokai_machine::{Envelope, Machine};
use maokai_runner::{Behaviors, Runner};
use tokio::sync::mpsc;

use super::behaviors::{ChampSelectBehavior, IdleBehavior, InGameBehavior};
use super::context::OngoingGameCtx;
use super::tree::ONGOING_TREE;
use super::types::OngoingGameInput;

type Envo = Envelope<OngoingGameInput, OngoingGameCtx>;

pub async fn machine_loop(
    mut input_rx: mpsc::UnboundedReceiver<OngoingGameInput>,
    ctx: OngoingGameCtx,
) {
    let t = &*ONGOING_TREE;
    let runner = Runner::new(&t.tree);

    let mut behaviors: Behaviors<'_, OngoingGameInput, Envo> = Behaviors::default();
    behaviors.register(&t.idle, IdleBehavior);
    behaviors.register(&t.champ_select, ChampSelectBehavior);
    behaviors.register(&t.in_game, InGameBehavior);

    let mut machine = Machine::new(&runner, &behaviors, ctx);
    machine.init(t.idle);

    loop {
        let Some(input) = input_rx.recv().await else { break };
        machine.post(input);
        machine.advance();
    }
}
