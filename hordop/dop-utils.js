var dopUtils = {};

/**
 * Snap all values to whole pixel values.
 * Works on single numbers or arrays of numbers.
 */
dopUtils.snap = function (num) {
    if (Array.isArray(num)) {
        return num.map(dopUtils.snap);
    }
    if (!isNaN(num)) {
        return Math.round(num);
    }
    return num;
};

/**
 * Basic shallow key/value extension of an object
 */
dopUtils.extend = function (dest, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) {
            dest[key] = src[key];
        }
    }
    return dest;
};

dopUtils.buildNodesAndLinks = function (dopData) {
    var candidates = dopData.candidates, flow = dopData.flow;
    var links = [];
    var nodes = [];
    var nodeGroups = [];
    var eliminated = d3.set();
    var prevNodes;
    var id = 0;

    // Go through each round of preferences and build nodes/links for remaining candidates
    flow.forEach(function (round) {
        var fromIndex = round.eliminated;
        var curNodes = d3.map();
        eliminated.add(fromIndex);

        // Go through each remaining candidate and distribute votes from the eliminated candidate
        // Eliminated ID of -1 indicates first preferences (all candidates are still valid)
        round.votes.forEach(function (votes, idx) {
            if (eliminated.has(idx)) {
                return;
            }
            var node = {
                id: id++,
                votes: votes,
                candidateIndex: idx,
                data: candidates[idx],
                sourceLinks: [],
                targetLinks: []
            };
            // If not first preferences, build flow links
            if (fromIndex > -1) {
                var prevNode = prevNodes.get(idx);
                node.votes += prevNode.votes;
                // A link for vote redistribution from an eliminated candidate
                var redistributeLink = {
                    source: prevNodes.get(fromIndex),
                    target: node,
                    votes: votes
                };
                // A link from the previous round for this same candidate
                var sameLink = {
                    source: prevNode,
                    target: node,
                    votes: prevNode.votes
                };
                links.push(redistributeLink, sameLink);
                node.targetLinks.push(redistributeLink, sameLink);
                prevNodes.get(fromIndex).sourceLinks.push(redistributeLink);
                prevNode.sourceLinks.push(sameLink);
                node.prevNode = prevNode;
            }
            node.value = node.votes;
            curNodes.set(idx, node);
        });
        prevNodes = curNodes;
        nodeGroups.push(curNodes.values());
    });

    // Calculate total number of votes
    var totalVotes = d3.sum(nodeGroups[0], function (d) {
        return d.votes;
    });
    // Sort each row of nodes
    nodeGroups.forEach(function (group) {
        group.sort(function (a, b) {
            return b.votes - a.votes;
        });
    });
    nodes = Array.prototype.concat.apply(nodes, nodeGroups);

    // Add a percentage to all nodes
    nodes.forEach(function (node) {
        node.votePercentage = node.votes / totalVotes * 100;
    });

    // Return all calculated objects
    return {
        nodes: nodes,
        nodeGroups: nodeGroups,
        links: links,
        totalVotes: totalVotes
    };
};
