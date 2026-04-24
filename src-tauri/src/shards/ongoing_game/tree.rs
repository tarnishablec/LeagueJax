use std::sync::LazyLock;

use maokai_tree::{DataView, State, StateTree, TreeView};

use super::types::OngoingGamePhase;

pub struct OngoingGameTree {
    pub tree: StateTree<OngoingGamePhase>,
    pub idle: State,
    pub matchmaking: State,
    pub ready_check: State,
    pub champ_select: State,
    pub in_game: State,
}

pub static ONGOING_TREE: LazyLock<OngoingGameTree> = LazyLock::new(|| {
    let mut tree = StateTree::new(OngoingGamePhase::Idle);
    let root = tree.root();
    let idle = tree.add_child(&root, OngoingGamePhase::Idle);
    let matchmaking = tree.add_child(&root, OngoingGamePhase::Matchmaking);
    let ready_check = tree.add_child(&root, OngoingGamePhase::ReadyCheck);
    let champ_select = tree.add_child(&root, OngoingGamePhase::ChampSelect);
    let in_game = tree.add_child(&root, OngoingGamePhase::InGame);
    OngoingGameTree {
        tree,
        idle,
        matchmaking,
        ready_check,
        champ_select,
        in_game,
    }
});

pub fn phase_of(state: &State) -> OngoingGamePhase {
    ONGOING_TREE
        .tree
        .get_data(state)
        .copied()
        .unwrap_or_default()
}
