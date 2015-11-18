/*
 * Copyright 2014-2016, Stigmergic-Modeling Project
 * SEIDR, Peking University
 * All rights reserved
 *
 * Stigmergic-Modeling is used for collaborative groups to create a conceptual model.
 * It is based on UML 2.0 class diagram specifications and stigmergy theory.
 */

package net.stigmod.repository.relationship;

import net.stigmod.domain.relationship.ClassToValueEdge;
import org.springframework.data.neo4j.repository.GraphRepository;
import org.springframework.stereotype.Repository;

/**
 * @author Kai Fu
 * @version 2015/11/10
 */
@Repository
public interface ClassToVEdgeRepository extends GraphRepository<ClassToValueEdge> {
}